/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  GlobalConfig,
  Test,
  Watcher,
  TestResult as TestResultBase,
} from '@jest-runner/core/types';
import type {TestResult} from '../types';

import {buildFailureTestResult} from '@jest-runner/core/utils';
import Docblock from '@jest-runner/core/docblock';
import {spawn} from 'child_process';
import fs from 'fs-extra';
import NuclideE2ERPCProcess from './rpc/NuclideE2ERPCProcess.generated';
import os from 'os';
import path from 'path';
import throat from 'throat';
import uuidv4 from 'uuid/v4';

const INJECTED_PACKAGE_PATH = path.resolve(
  __dirname,
  './nuclide-e2e-injected-package',
);

const makeTmpDirs = runID => {
  const tmpDir = path.resolve(os.tmpdir(), `.atom-${runID}`);
  // temp ~ that can be set to process.env.HOME to make sure
  // e2e tests don't write anything in the home dir of the user
  // that's running the test.
  const userHome = path.join(tmpDir, 'USER_HOME');
  const atomHome = path.join(tmpDir, 'ATOM_HOME');
  const packagesPath = path.join(atomHome, 'packages');
  fs.mkdirpSync(packagesPath);
  fs.mkdirpSync(userHome);
  fs.ensureSymlinkSync(
    INJECTED_PACKAGE_PATH,
    path.join(packagesPath, path.basename(INJECTED_PACKAGE_PATH)),
  );
  return {atomHome, userHome};
};

let thingsToCleanUp = [];

const spawnAtomProcess = (
  {atomHome, atomExecutable, onOutput, runID, userHome},
  {serverID},
) => {
  if (!atomExecutable || !fs.existsSync(atomExecutable)) {
    throw new Error(`
    can't find atomExecutable: "${JSON.stringify(atomExecutable)}".
    Make sure you have it specified in ${NUCLIDE_E2E_CONFIG_NAME}`);
  }
  const spawned = spawn(atomExecutable, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ATOM_HOME: atomHome,
      HOME: userHome,
      JEST_RUN_ID: runID,
      JEST_SERVER_ID: serverID,
    },
    detached: true,
  });

  spawned.stdout.on('data', onOutput.bind(null, 'stdout'));
  spawned.stderr.on('data', onOutput.bind(null, 'stderr'));

  return spawned;
};

const once = fn => {
  let hasBeenCalled = false;
  return (...args) => {
    if (!hasBeenCalled) {
      hasBeenCalled = true;
      return fn(...args);
    }
  };
};

type ConsoleOutput = ?Array<{message: string, origin: string, output: string}>;
type NuclideE2EConfig = {|
  atomExecutable: string,
  consoleFilter: ConsoleOutput => ConsoleOutput,
  testTeardown?: ({runID: string, atomHome: string}) => void,
  retries?: number,
|};

const NUCLIDE_E2E_CONFIG_NAME = 'jest.nuclide-e2e-runner-config.js';

const findConfig = (rootDir): NuclideE2EConfig => {
  if (rootDir === path.basename(rootDir)) {
    throw new Error(`
    Could not find a configuration file for Nuclide E2E test runner.
    Config file must be named ${NUCLIDE_E2E_CONFIG_NAME} and put either in the rootDir
    of jest project or in any of its parents.`);
  }
  const configPath = path.join(rootDir, NUCLIDE_E2E_CONFIG_NAME);
  return fs.existsSync(configPath)
    ? // $FlowFixMe dynamic require
      require(configPath)
    : findConfig(path.basename(rootDir));
};

export default class TestRunner {
  _globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this._globalConfig = globalConfig;
  }

  async runTests(
    tests: Array<Test>,
    watcher: Watcher,
    onStart: Test => void,
    onResult: (Test, TestResult) => void,
    onFailure: (Test, Error) => void,
  ) {
    // Force concurrency to be 1. Multiple atoms conflict with each other
    // even if run from completely separate directories.
    const concurrency = 1;
    const keepProcessAlive = this._globalConfig.expand;
    if (keepProcessAlive && tests.length > 1) {
      throw new Error(
        '--expand option can only be used when running a single test',
      );
    }

    const cleanup = once(() => {
      thingsToCleanUp.forEach(fn => fn());
      thingsToCleanUp = [];
    });

    process.on('SIGINT', () => {
      cleanup();
      process.exit(130);
    });
    process.on('uncaughtException', error => {
      // eslint-disable-next-line no-console
      console.error(error);
      cleanup();
      // This will prevent other handlers to handle errors
      // (e.g. global Jest handler). TODO: find a way to provide
      // a cleanup function to Jest so it runs it instead
      process.exit(1);
    });

    await Promise.all(
      tests.map(
        throat(concurrency, async test => {
          const config = test.context.config;
          const globalConfig = this._globalConfig;
          const {
            atomExecutable,
            consoleFilter,
            testTeardown,
            retries,
          } = findConfig(config.rootDir);
          let retriesLeft = retries || 1;
          let allRunResults = [];

          try {
            onStart(test);

            while (retriesLeft) {
              retriesLeft -= 1;
              const runID = uuidv4();
              const {processOutput, testResult} = await _runTest(test, {
                keepProcessAlive,
                globalConfig,
                testTeardown,
                atomExecutable,
                runID,
              });

              const amendedTestResult: TestResult = amendTestResult({
                testResult,
                processOutput,
                runID,
                consoleFilter,
              });

              allRunResults.push(amendedTestResult);
              if (!hasFailed(amendedTestResult)) {
                break;
              }
            }

            const [lastResult, ...retriedResults] = allRunResults.reverse();

            lastResult.retriedResults = retriedResults.reverse();
            lastResult.testExecError != null
              ? // $FlowFixMe jest expects it to be rejected with an object
                onFailure(test, lastResult.testExecError)
              : onResult(test, lastResult);
          } catch (error) {
            onFailure(
              test,
              buildFailureTestResult(test.path, error, config, globalConfig)
                .testExecError,
            );
          }
        }),
      ),
    );
    if (!keepProcessAlive) {
      cleanup();
    }
  }
}

const _runTest = async (
  test,
  {keepProcessAlive, globalConfig, atomExecutable, testTeardown, runID},
) => {
  const config = test.context.config;
  const {atomHome, userHome} = makeTmpDirs(runID);
  let processOutput = [];
  const onOutput = (pipe: string, data: string) => {
    const message = data.toString ? data.toString() : data;
    processOutput.push({
      message,
      origin: `Atom process ${pipe}`,
      type: 'log',
    });
  };
  const nuclideE2ERPCProcess = new NuclideE2ERPCProcess({
    spawn: spawnAtomProcess.bind(null, {
      atomHome,
      atomExecutable,
      onOutput,
      runID,
      userHome,
    }),
  });
  const directives = Docblock.fromFile(test.path).getDirectives();
  for (const setupFile of config.setupFiles) {
    // $FlowFixMe dynamic require
    const setup = require(setupFile); // if it's a function call it and pass arguments. This is different
    // from how Jest works, but right now there's no other workaround to it
    typeof setup === 'function' && (await setup({atomHome, directives}));
  }
  await nuclideE2ERPCProcess.start();

  const localCleanup = once(() => {
    nuclideE2ERPCProcess.remote.shutDown();
    nuclideE2ERPCProcess.stop();
    testTeardown && testTeardown({runID, atomHome});
  });
  // Add to global cleanup in case the process crashes or something. We still want to kill all
  // subprocesses.
  thingsToCleanUp.push(localCleanup);
  const testResult: TestResultBase = await nuclideE2ERPCProcess.remote.runTest({
    config,
    globalConfig,
    path: test.path,
  });
  // We'll reuse `expand` flag (not the best idea) to keep the nuclide process
  // alive if we want to go back and debug something.
  if (!keepProcessAlive) {
    localCleanup();
  }
  return {processOutput, testResult};
};

// Add values to the test result that are specific to this runner.
const amendTestResult = ({
  testResult,
  processOutput,
  consoleFilter,
  runID,
}): TestResult => {
  const amendedTestResult = {
    ...testResult,
    runID,
    console: processOutput.length
      ? // Add messages from process output to test results
        [...processOutput, ...(testResult.console || [])]
      : testResult.console,
  };
  amendedTestResult.console = consoleFilter(testResult.console);
  return amendedTestResult;
};

const hasFailed = testResult => {
  if (testResult.numFailingTests) {
    return true;
  }

  if (testResult.testExecError) {
    return true;
  }

  return false;
};

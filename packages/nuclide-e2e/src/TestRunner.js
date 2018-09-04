/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {
  GlobalConfig,
  Test,
  TestResult,
  Watcher,
} from '@jest-runner/core/types';
import type {IPCServer} from '../../core/src/ipc-server';

import {spawn} from 'child_process';
import NuclideE2ERPCProcess from './rpc/NuclideE2ERPCProcess.generated';
import path from 'path';
import throat from 'throat';
import type {ServerID} from '../../core/src/utils';
import os from 'os';
import uuidv4 from 'uuid/v4';
import fs from 'fs-extra';

const INJECTED_PACKAGE_PATH = path.resolve(
  __dirname,
  './nuclide-e2e-injected-package',
);

const makeTmpAtomHome = () => {
  const dirPath = path.resolve(os.tmpdir(), `.atom-${uuidv4()}`);
  const packagesPath = path.join(dirPath, 'packages');
  fs.mkdirpSync(dirPath);
  fs.mkdirpSync(packagesPath);
  fs.ensureSymlinkSync(
    INJECTED_PACKAGE_PATH,
    path.join(packagesPath, path.basename(INJECTED_PACKAGE_PATH)),
  );
  return dirPath;
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

export default class TestRunner {
  _globalConfig: GlobalConfig;
  _serverID: ServerID;
  _ipcServerPromise: Promise<IPCServer>;

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
    const isWatch = this._globalConfig.watch || this._globalConfig.watchAll;
    const concurrency = isWatch
      ? 1
      : Math.min(tests.length, this._globalConfig.maxWorkers);

    const atomHome = makeTmpAtomHome();

    console.log({atomHome});
    console.log({atomHome});
    console.log({atomHome});
    console.log({atomHome});
    console.log({atomHome});
    console.log({atomHome});
    console.log({atomHome});
    const nuclideE2ERPCProcess = new NuclideE2ERPCProcess({
      spawn: ({serverID}) => {
        // const injectedCodePath = require.resolve(
        //   './electron_process_injected_code.js',
        // );
        return spawn('atom', {
          stdio: [
            'inherit',
            // redirect child process' stdout to parent process stderr, so it
            // doesn't break any tools that depend on stdout (like the ones
            // that consume a generated JSON report from jest's stdout)
            process.stderr,
            'inherit',
          ],
          env: {
            ...process.env,
            JEST_SERVER_ID: serverID,
            ATOM_HOME: atomHome,
          },
          detached: true,
        });
      },
    });

    const cleanup = once(() => {
      nuclideE2ERPCProcess.stop();
    });

    process.on('SIGINT', () => {
      cleanup();
      process.exit(130);
    });
    process.on('uncaughtException', () => {
      cleanup();
      // This will prevent other handlers to handle errors
      // (e.g. global Jest handler). TODO: find a way to provide
      // a cleanup function to Jest so it runs it instead
      process.exit(1);
    });

    await nuclideE2ERPCProcess.start();
    await Promise.all(
      tests.map(
        throat(concurrency, test => {
          onStart(test);
          const config = test.context.config;
          const globalConfig = this._globalConfig;
          return nuclideE2ERPCProcess.remote
            .runTest({
              config,
              globalConfig,
              path: test.path,
            })
            .then(testResult => {
              testResult.testExecError != null
                ? // $FlowFixMe jest expects it to be rejected with an object
                  onFailure(test, testResult.testExecError)
                : onResult(test, testResult);
            })
            .catch(error => onFailure(test, error));
        }),
      ),
    );

    if (!isWatch) {
      cleanup();
    }
  }
}

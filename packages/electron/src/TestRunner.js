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
import type {TestRunnerTarget} from '../types.js';

import {spawn} from 'child_process';
import {once} from './utils/once.js';
import JestWorkerRpcProcess from './rpc/JestWorkerRPCProcess.generated';
import {getElectronBin} from './utils/get_electron_bin.js';
import throat from 'throat';

// Share ipc server and farm between multiple runs, so we don't restart
// the whole thing in watch mode every time.
let jestWorkerRPCProcess: ?JestWorkerRpcProcess;

const isMain = target => target === 'main';
const isRenderer = target => target === 'renderer';

const startWorker = async ({
  rootDir,
  target,
}): Promise<JestWorkerRpcProcess> => {
  if (isRenderer(target) && jestWorkerRPCProcess) {
    return jestWorkerRPCProcess;
  }

  const proc = new JestWorkerRpcProcess({
    spawn: ({serverID}) => {
      const injectedCodePath = require.resolve(
        './electron_process_injected_code.js',
      );

      const currentNodeBinPath = process.execPath;
      const electronBin = getElectronBin(rootDir);
			const spawnArgs = [electronBin]
			if (process.env.JEST_ELECTRON_RUNNER_MAIN_THREAD_DEBUG_PORT) {
				spawnArgs.push(`--inspect=${process.env.JEST_ELECTRON_RUNNER_MAIN_THREAD_DEBUG_PORT}`)
			}
			if (process.env.JEST_ELECTRON_RUNNER_RENDERER_THREAD_DEBUG_PORT) {
				spawnArgs.push(`--remote-debugging-port=${process.env.JEST_ELECTRON_RUNNER_RENDERER_THREAD_DEBUG_PORT}`)
			}
			spawnArgs.push(injectedCodePath)

      return spawn(currentNodeBinPath, spawnArgs, {
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
          ...(isMain(target) ? {isMain: 'true'} : {}),
          JEST_SERVER_ID: serverID,
        },
        detached: process.env.JEST_ELECTRON_RUNNER_DISABLE_PROCESS_DETACHMENT ? false : true,
      });
    },
  });

  if (isRenderer(target)) {
    jestWorkerRPCProcess = proc;
  }

  await proc.start();
  DISPOSABLES.add(() => {
    proc.stop();
  });

  return proc;
};

const registerProcessListeners = (cleanup: Function) => {
  registerProcessListener('SIGINT', () => {
    cleanup();
    process.exit(130);
  });

  registerProcessListener('exit', () => {
    cleanup();
  });

  registerProcessListener('uncaughtException', () => {
    cleanup();
    // This will prevent other handlers to handle errors
    // (e.g. global Jest handler). TODO: find a way to provide
    // a cleanup function to Jest so it runs it instead
    process.exit(1);
  });
};

const DISPOSABLES = new Set();

export default class TestRunner {
  _globalConfig: GlobalConfig;
  _ipcServerPromise: Promise<IPCServer>;

  getTarget(): TestRunnerTarget {
    throw new Error('Must be implemented in a subclass');
  }

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
    const {maxWorkers, rootDir} = this._globalConfig;
    const concurrency = isWatch
      ? // because watch is usually used in the background, we'll only use
        // half of the regular workers so we don't block other develper
        // environment UIs
        Math.ceil(Math.min(tests.length, maxWorkers) / 2)
      : Math.min(tests.length, maxWorkers);
    const target = this.getTarget();

    const cleanup = once(() => {
      for (const dispose of DISPOSABLES) {
        dispose();
        DISPOSABLES.delete(dispose);
      }
    });

    registerProcessListeners(cleanup);

    // Startup the process for renderer tests, since it'll be one
    // process that every test will share.
    isRenderer(target) && (await startWorker({rootDir, target}));

    await Promise.all(
      tests.map(
        throat(concurrency, async test => {
          onStart(test);
          const config = test.context.config;
          const globalConfig = this._globalConfig;
          // $FlowFixMe
          const rpc = await startWorker({rootDir, target});
          await rpc.remote
            .runTest({
              serializableModuleMap: test.context.moduleMap.toJSON(),
              config,
              globalConfig,
              path: test.path,
            })
            .then(testResult => {
              testResult.testExecError != null
                ? onFailure(test, testResult.testExecError)
                : onResult(test, testResult);
            })
            .catch(error => onFailure(test, error));
          // If we're running tests in electron 'main' process
          // we need to respawn them for every single test.
          isMain(target) && rpc.stop();
        }),
      ),
    );

    if (!isWatch) {
      cleanup();
    }
  }
}

// Because in watch mode the TestRunner is recreated each time, we have
// to make sure we're not registering new process events on every test
// run trigger (at some point EventEmitter will start complaining about a
// memory leak if we do).We'll keep a global map of callbalks (because
// `process` is global) and deregister the old callbacks before we register
// new ones.
const REGISTERED_PROCESS_EVENTS_MAP = new Map();
const registerProcessListener = (eventName: string, cb: Function) => {
  if (REGISTERED_PROCESS_EVENTS_MAP.has(eventName)) {
    (process: any).off(eventName, REGISTERED_PROCESS_EVENTS_MAP.get(eventName));
  }
  process.on(eventName, cb);
  REGISTERED_PROCESS_EVENTS_MAP.set(eventName, cb);
};

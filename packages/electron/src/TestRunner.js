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
import JestWorkerRpcProcess from './rpc/JestWorkerRPCProcess.generated';
import path from 'path';
import throat from 'throat';
import type {ServerID} from '../../core/src/utils';

// Share ipc server and farm between multiple runs, so we don't restart
// the whole thing in watch mode every time.
let jestWorkerRPCProcess;

const getElectronBin = (from: string) => {
  try {
    // first try to resolve from the `rootDir` of the project
    return path.resolve(
      // $FlowFixMe wrong core flow types for require.resolve
      require.resolve('electron', {paths: [from]}),
      '..',
      'cli.js',
    );
  } catch (error) {
    // default to electron included in this package's dependencies
    return path.resolve(require.resolve('electron'), '..', 'cli.js');
  }
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
  _processEventRegistered: Object;

  constructor(globalConfig: GlobalConfig) {
    this._globalConfig = globalConfig;
    this._processEventRegistered = {};
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

    if (!jestWorkerRPCProcess) {
      jestWorkerRPCProcess = new JestWorkerRpcProcess({
        spawn: ({serverID}) => {
          const injectedCodePath = require.resolve(
            './electron_process_injected_code.js',
          );
          const currentNodeBinPath = process.execPath;
          const electronBin = getElectronBin(this._globalConfig.rootDir);
          return spawn(currentNodeBinPath, [electronBin, injectedCodePath], {
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
            },
            detached: true,
          });
        },
      });
      await jestWorkerRPCProcess.start();
    }

    const cleanup = once(() => {
      jestWorkerRPCProcess.stop();
    });

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

    await Promise.all(
      tests.map(
        throat(concurrency, test => {
          onStart(test);
          const rawModuleMap = test.context.moduleMap.getRawModuleMap();
          const config = test.context.config;
          const globalConfig = this._globalConfig;
          return jestWorkerRPCProcess.remote
            .runTest({
              rawModuleMap,
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

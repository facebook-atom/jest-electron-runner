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
import {spawnRpcProcess} from './utils/spawnRpcProcess';
import {once} from './utils/once';
import TestRunnerBase from './TestRunnerBase';

// Share ipc server and farm between multiple runs, so we don't restart
// the whole thing in watch mode every time.
let jestWorkerRPCProcess;

export default class TestRunner extends TestRunnerBase {
  _globalConfig: GlobalConfig;
  _serverID: ServerID;
  _ipcServerPromise: Promise<IPCServer>;

  constructor(globalConfig: GlobalConfig) {
    super(globalConfig);
  }

  cleanup() {
    once(() => {
      jestWorkerRPCProcess.stop();
    })();
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
      jestWorkerRPCProcess = spawnRpcProcess({
        globalConfig: this._globalConfig,
        isMain: false,
      });
      await jestWorkerRPCProcess.start();
    }

    await Promise.all(
      tests.map(
        throat(concurrency, test => {
          onStart(test);
          const {rawModuleMap, config} = this.testRunContext(test);
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
      this.cleanup();
    }
  }
}

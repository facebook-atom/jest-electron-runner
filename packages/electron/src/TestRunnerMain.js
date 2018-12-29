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

import throat from 'throat';
import type {ServerID} from '../../core/src/utils';
import type {TestRunnerOptions} from '../../core/types';
import {spawnRpcProcess} from './utils/spawnRpcProcess';
import {once} from './utils/once';
import TestRunnerBase from './TestRunnerBase';

const RPC_PROCESS_CACHE = new Map();
export default class TestRunner extends TestRunnerBase {
  _globalConfig: GlobalConfig;
  _serverID: ServerID;
  _ipcServerPromise: Promise<IPCServer>;

  constructor(globalConfig: GlobalConfig) {
    super(globalConfig);
  }

  cleanup() {
    once(() => {
      for (let [, rpcProcess] of RPC_PROCESS_CACHE.entries()) rpcProcess.stop();
    })();
  }

  async runTests(
    tests: Array<Test>,
    watcher: Watcher,
    onStart: Test => void,
    onResult: (Test, TestResult) => void,
    onFailure: (Test, Error) => void,
    options: TestRunnerOptions,
  ) {
    const isWatch = this._globalConfig.watch || this._globalConfig.watchAll;
    const concurrency = options.serial
      ? 1
      : Math.min(tests.length, this._globalConfig.maxWorkers);

    await Promise.all(
      tests.map(
        throat(concurrency, async test => {
          onStart(test);
          const {rawModuleMap, config} = this.testRunContext(test);
          const globalConfig = this._globalConfig;

          let rpc;
          if (!RPC_PROCESS_CACHE.has(test.path)) {
            rpc = spawnRpcProcess({
              globalConfig,
              isMain: true,
            });

            RPC_PROCESS_CACHE.set(test.path, rpc);
          } else rpc = RPC_PROCESS_CACHE.get(test.path);

          // $FlowFixMe returns rpc as undefined, when we know it does not
          await rpc.start();
          // $FlowFixMe returns rpc as undefined, when we know it does not
          return rpc.remote
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

              // $FlowFixMe returns rpc as undefined, when we know it does not
              rpc.stop();
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

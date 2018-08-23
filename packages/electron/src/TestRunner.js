/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {IPCServer} from '../../core/src/ipc-server';
import type {GlobalConfig, Test, TestResult, Watcher} from '../../../types';
import type {ServerID} from '../../core/src/utils';

import {startServer} from '@jest-runner/core/ipc-server';
import {makeUniqServerId, invariant} from '@jest-runner/core/utils';
import ElectronProcess from './ElectronProcess';
import throat from 'throat';

// Share ipc server and farm between multiple runs, so we don't restart
// the whole thing in watch mode every time. (it steals window focus when
// atom launches)
let ipcServerPromise;
let serverID;
let electronProcess;
let cleanupRegistered = false;

export default class TestRunner {
  _globalConfig: GlobalConfig;
  _serverID: ServerID;
  _ipcServerPromise: Promise<IPCServer>;

  constructor(globalConfig: GlobalConfig) {
    this._globalConfig = globalConfig;
    serverID = serverID || (serverID = makeUniqServerId());
    this._serverID = serverID;
    ipcServerPromise ||
      (ipcServerPromise = startServer({
        serverID: this._serverID,
      }));
  }

  async runTests(
    tests: Array<Test>,
    watcher: Watcher,
    onStart: Test => void,
    onResult: (Test, TestResult) => void,
    onFailure: (Test, Error) => void,
    options: {},
  ) {
    const isWatch = this._globalConfig.watch || this._globalConfig.watchAll;
    const concurrency = isWatch
      ? 1
      : Math.min(tests.length, this._globalConfig.maxWorkers);
    const ipcServer = await ipcServerPromise;

    if (!electronProcess) {
      electronProcess = new ElectronProcess({
        serverID: this._serverID,
        ipcServer: await ipcServer,
        globalConfig: this._globalConfig,
        concurrency,
      });
      await electronProcess.start();
    }

    const cleanup = async () => {
      electronProcess.stop();
      ipcServer.stop();
    };

    if (!cleanupRegistered) {
      cleanupRegistered = true;
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGUSR1', cleanup);
      process.on('SIGUSR2', cleanup);
      process.on('uncaughtException', cleanup);
    }

    await Promise.all(
      tests.map(
        throat(concurrency, test => {
          return electronProcess
            .runTest(test, onStart)
            .then(testResult => onResult(test, testResult))
            .catch(error => onFailure(test, error));
        }),
      ),
    );

    if (!isWatch) {
      cleanup();
    }
  }
}

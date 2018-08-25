/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {Test, GlobalConfig, TestResult} from '../../../types';
import type {IPCServer, Socket} from '../../core/src/ipc-server';
import type {MessageType, ServerID, WorkerID} from '../../core/src/utils';

import {
  makeMessage,
  makeUniqWorkerId,
  MESSAGE_TYPES,
  parseJSON,
  parseMessage,
} from '@jest-runner/core/utils';
import {spawn, execSync} from 'child_process';
import path from 'path';

type TestRunResolver = {resolve: TestResult => void, reject: Error => void};

const ELECTRON_BIN = path.resolve(require.resolve('electron'), '..', 'cli.js');

export default class ElectronProcess {
  _alive: boolean;
  _concurrency: number;
  _globalConfig: GlobalConfig;
  _ipcServer: IPCServer;
  _serverID: ServerID;
  _socket: ?Socket;
  _subprocess: child_process$ChildProcess;
  _workerID: WorkerID;
  _runningTests: Map<string, TestRunResolver>;

  constructor({
    serverID,
    ipcServer,
    globalConfig,
    concurrency,
  }: {
    ipcServer: IPCServer,
    serverID: ServerID,
    globalConfig: GlobalConfig,
    concurrency: number,
  }) {
    this._workerID = makeUniqWorkerId();
    this._serverID = serverID;
    this._ipcServer = ipcServer;
    this._globalConfig = globalConfig;
    this._concurrency = concurrency;
    this._alive = false;
    this._runningTests = new Map();
  }

  _spawnSubprocess() {
    const {_serverID: serverID, _workerID: workerID} = this;
    const injectedCodePath = require.resolve(
      './electron_process_injected_code.js',
    );
    return spawn(ELECTRON_BIN, [injectedCodePath], {
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
        JEST_WORKER_ID: workerID,
      },
      detached: true,
    });
  }
  async start() {
    return new Promise(resolve => {
      this._ipcServer.on(this._workerID, (message, socket) => {
        const {messageType, data} = parseMessage(message);
        switch (messageType) {
          case MESSAGE_TYPES.INITIALIZE: {
            if (!this._alive) {
              this._alive = true;
              this._socket = socket;
              resolve();
            } else {
              // TODO: handle properly
              throw new Error(
                `INITIALIZE message was received more than once for this worker: ${message}`,
              );
            }
            break;
          }
          default: {
            this._onMessage({messageType, data});
          }
        }
      });
      this._subprocess = this._spawnSubprocess();
    });
  }
  _onMessage({messageType, data}: {messageType: MessageType, data: string}) {
    switch (messageType) {
      case MESSAGE_TYPES.TEST_RESULT: {
        const testResult: TestResult = parseJSON(data);
        const {testFilePath} = testResult;
        const runningTest = this._runningTests.get(testFilePath);
        if (!runningTest) {
          throw new Error(`
                Can't find any references to the test result that returned from the worker.
                returned test path: ${testFilePath}
                list of tests that we know has been running in the worker:
                ${Array.from(this._runningTests)
                  .map(([key, _]) => key)
                  .join(', ')}
                `);
        }

        testResult.testExecError != null
          ? // $FlowFixMe jest expects it to be rejected with an object
            runningTest.reject(testResult.testExecError)
          : runningTest.resolve(testResult);
        this._runningTests.delete(testFilePath);
      }
    }
  }

  send(message: string) {
    if (!this._socket || !this._alive || !this._workerID) {
      throw new Error("Can't interact with the worker before it comes alive");
    }
    this._ipcServer.emit(this._socket, this._workerID, message);
  }

  async stop() {
    this.send(makeMessage({messageType: MESSAGE_TYPES.SHUT_DOWN}));
    this._subprocess.on('error', error => {
      console.error('ERROR:', error);
    });
    process.kill(-this._subprocess.pid);
    this._subprocess.kill();
  }
  async runTest(test: Test, onStart: Test => void): Promise<TestResult> {
    if (this._runningTests.has(test.path)) {
      throw new Error(
        "Can't run the same test in the same worker at the same time",
      );
    }
    return new Promise((resolve, reject) => {
      // Ideally we don't want to pass all thing info with every test
      // because it never changes. We should try to initialize it
      // when the worker starts and keep it there for the whole run
      // (if it's a single run and not a watch mode of course, in that case
      // it'll be able to change)
      const rawModuleMap = test.context.moduleMap.getRawModuleMap();
      const config = test.context.config;
      const globalConfig = this._globalConfig;

      this.send(
        makeMessage({
          messageType: MESSAGE_TYPES.RUN_TEST,
          data: JSON.stringify({
            rawModuleMap,
            config,
            globalConfig,
            path: test.path,
          }),
        }),
      );

      this._runningTests.set(test.path, {resolve, reject});
    });
  }
}

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

/* This is a Jest worker. An abstraction class that knows how to start up
  * a subprocess and communicate with it */

import type {IPCServer, Socket} from './ipc-server';
import type {ServerID, WorkerID, MessageType} from './utils';
import type {Test, GlobalConfig, TestResult} from './types';

// eslint-disable-next-line nuclide-internal/consistent-import-name
import {spawn} from 'child_process';
import mkdirp from 'mkdirp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {makeUniqWorkerId, parseMessage, makeMessage, MESSAGE_TYPES, parseJSON} from './utils';

type OnMessageCallback = (MessageType, data?: string) => void;
type TestRunResolver = {resolve: TestResult => void, reject: Error => void};

export default class TestWorker {
  _childProcess: child_process$ChildProcess;
  _ipcServer: IPCServer;
  _serverID: ServerID;
  _workerID: WorkerID;
  _alive: boolean; // whether the worker is up and running
  _socket: ?Socket;
  _onMessageCallbacks: Array<OnMessageCallback>;
  _globalConfig: GlobalConfig;
  _runningTests: Map<string, TestRunResolver>;

  constructor({
    ipcServer,
    serverID,
    globalConfig,
  }: {
    ipcServer: IPCServer,
    serverID: ServerID,
    globalConfig: GlobalConfig,
  }) {
    this._ipcServer = ipcServer;
    this._serverID = serverID;
    this._alive = false;
    this._onMessageCallbacks = [];
    this._workerID = makeUniqWorkerId();
    this._globalConfig = globalConfig;
    this._runningTests = new Map();
  }

  spawnSubprocess(): child_process$ChildProcess {
    throw new Error('Not Implemented');
  }

  async start() {
    const {_serverID: serverID, _ipcServer: ipcServer} = this;
    return new Promise(resolve => {
      const workerID = this._workerID;

      let firstMessage = false;
      ipcServer.on(workerID, (message, socket) => {
        const {messageType, data} = parseMessage(message);
        if (!firstMessage) {
          firstMessage = true;
          this._alive = true;
          this._socket = socket;
          resolve();
        } else {
          this._onMessage((messageType: MessageType), data);
        }
      });

      this._childProcess = this.spawnSubprocess();
      const crash = error => {
        for (const {reject} of this._runningTests.values()) {
          reject(error);
        }
      };
      this._childProcess.on('error', crash);
      this._childProcess.on('close', code => {
        crash(new Error(`child process exited with code: ${code}`));
      });
    });
  }

  async stop() {
    this.send(makeMessage({messageType: MESSAGE_TYPES.SHUT_DOWN}));
    this._childProcess.kill('SIGTERM');
  }

  send(message: string) {
    if (!this._socket || !this._alive || !this._workerID) {
      throw new Error("Can't interact with the worker before it comes alive");
    }
    this._ipcServer.emit(this._socket, this._workerID, message);
  }

  _onMessage(messageType: MessageType, data: string) {
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

  runTest(test: Test): Promise<TestResult> {
    if (this._runningTests.has(test.path)) {
      throw new Error("Can't run the same test in the same worker at the same time");
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

  isBusy() {
    return this._runningTests.size > 0;
  }
}

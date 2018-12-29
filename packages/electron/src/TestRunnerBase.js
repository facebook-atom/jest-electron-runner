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

import path from 'path';
import throat from 'throat';
import type {ServerID} from '../../core/src/utils';
import {spawnRpcProcess, closeAllRpcProcesses} from './utils/spawnRpcProcess';
import {once} from './utils/once';

export default class TestRunnerBase {
  _globalConfig: GlobalConfig;
  _serverID: ServerID;
  _ipcServerPromise: Promise<IPCServer>;

  constructor(globalConfig: GlobalConfig) {
    this._globalConfig = globalConfig;
    this.processListenersInit();
  }

  processListenersInit() {
    registerProcessListener('SIGINT', () => {
      this.cleanup();
      process.exit(130);
    });

    registerProcessListener('exit', () => {
      this.cleanup();
    });

    registerProcessListener('uncaughtException', () => {
      this.cleanup();
      // This will prevent other handlers to handle errors
      // (e.g. global Jest handler). TODO: find a way to provide
      // a cleanup function to Jest so it runs it instead
      process.exit(1);
    });
  }

  testRunContext = test => ({
    rawModuleMap: test.context.moduleMap.getRawModuleMap(),
    config: test.context.config,
  });
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

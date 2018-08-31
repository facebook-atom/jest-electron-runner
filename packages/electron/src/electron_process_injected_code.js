/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

// $FlowFixMe flow doesn't know about console
import {Console} from 'console';
delete global.console;
global.console = new Console(process.stdout, process.stderr);
// $FlowFixMe
import {app, BrowserWindow, ipcMain} from 'electron';

import type {IPCWorker} from '../../core/src/ipc-client';
import type {MessageType} from '../../core/src/utils';

import {connectToIPCServer} from '@jest-runner/core/ipc-client';
import {
  getIPCIDs,
  MESSAGE_TYPES,
  parseMessage,
  parseJSON,
  makeMessage,
  makeUniqWorkerId,
  buildFailureTestResult,
} from '@jest-runner/core/utils';
import os from 'os';
import runTest from 'jest-runner/build/run_test';
import Runtime from 'jest-runtime';
import HasteMap from 'jest-haste-map';

import RPCConnection from '@jest-runner/rpc/RPCConnection';
import JestWorkerRPC from './rpc/JestWorkerRPC';

// const appReady = new Promise(r => app.on('ready', r));
app.on('ready', async () => {
  // electron automatically quits if all windows are destroyed,
  // this mainWindow will keep electron running even if all other windows
  // are gone. There's probably a better way to do it.
  const mainWindow = new BrowserWindow({show: false});
  const rpcConnection = new RPCConnection(JestWorkerRPC);
  await rpcConnection.connect();
});

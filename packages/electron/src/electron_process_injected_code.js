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

const appReady = new Promise(r => app.on('ready', r));

const _runTest = testData => {
  return new Promise(resolve => {
    const workerID = makeUniqWorkerId();
    const win = new BrowserWindow({show: false});
    win.loadURL(`file://${require.resolve('./index.html')}`);
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('run-test', {testData, workerID});
    });

    ipcMain.once(workerID, (event, data) => {
      win.destroy();
      resolve(data);
    });
  });
};

const start = async () => {
  await appReady;
  // electron automatically quits if all windows are destroyed,
  // this mainWindow will keep electron running even if all other windows
  // are gone. There's probably a better way to do it.
  const mainWindow = new BrowserWindow({show: false});
  return new Promise(async resolve => {
    const {serverID, workerID} = getIPCIDs();
    const connection: IPCWorker = await connectToIPCServer({
      serverID,
      workerID,
    });

    connection.onMessage(message => {
      try {
        const {messageType, data} = parseMessage(message);

        switch (messageType) {
          case MESSAGE_TYPES.RUN_TEST: {
            const testData = parseJSON(data);
            _runTest(testData)
              .catch(error => {
                const testResult = buildFailureTestResult(
                  testData.path,
                  error,
                  testData.config,
                  testData.globalConfig,
                );
                return testResult;
              })
              .then(result => {
                const msg = makeMessage({
                  messageType: MESSAGE_TYPES.TEST_RESULT,
                  data: JSON.stringify(result),
                });
                connection.send(msg);
              });
            break;
          }
          case MESSAGE_TYPES.SHUT_DOWN: {
            resolve();
            connection.disconnect();
            mainWindow.destroy();
            // process.exit(0);
            break;
          }
        }
      } catch (e) {
        console.error(e);
      }
    });
  });
};

start()
  .then(() => {
    // process.exit(0);
  })
  .catch(e => {
    console.error(e);
    // process.exit(1);
  });

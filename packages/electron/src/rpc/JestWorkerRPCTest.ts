/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {BrowserWindow, ipcMain} from 'electron';
// @ts-ignore until module is typed
import runTest from 'jest-runner/build/run_test';

// @ts-ignore until module is typed
import {TestResult} from '@jest-runner/core/src/types';
// @ts-ignore until module is typed
import {buildFailureTestResult, makeUniqWorkerId} from '@jest-runner/core/src/utils';

import {IPCTestData} from '../types';
// @ts-ignore until module is typed
import {getResolver} from '../utils/resolver';

const isMain = process.env.isMain === 'true';

const _runInNode = async (testData: IPCTestData): Promise<TestResult> => {
  try {
    return runTest(
      testData.path,
      testData.globalConfig,
      testData.config,
      getResolver(testData.config, testData.rawModuleMap),
    );
  } catch (error) {
    console.error(error);
    return buildFailureTestResult(
      testData.path,
      error,
      testData.config,
      testData.globalConfig,
    );
  }
};

const _runInBrowserWindow = (testData: IPCTestData): Promise<TestResult> => {
  return new Promise<TestResult>(resolve => {
    const workerID = makeUniqWorkerId();
    const win = new BrowserWindow({show: false});

    win.loadURL(`file://${require.resolve('../index.html')}`);
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('run-test', testData, workerID);
    });

    ipcMain.once(workerID, (_event: any, testResult: TestResult) => {
      win.destroy();
      resolve(testResult);
    });
  }).catch(error => {
    const testResult = buildFailureTestResult(
      testData.path,
      error,
      testData.config,
      testData.globalConfig,
    );
    return testResult;
  });
};

const _runTest = (testData: IPCTestData): Promise<TestResult> => {
  return isMain ? _runInNode(testData) : _runInBrowserWindow(testData);
};

export default {
  runTest(testData: IPCTestData): Promise<TestResult> {
    return _runTest(testData);
  },
  shutDown(): Promise<any> {
    return Promise.resolve();
  },
};

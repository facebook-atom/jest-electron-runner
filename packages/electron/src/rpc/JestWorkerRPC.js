/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {TestResult} from '@jest-runner/core/types';
import type {IPCTestData} from '../../types';
import runTest from 'jest-runner/build/runTest';

import {
  makeUniqWorkerId,
  buildFailureTestResult,
} from '@jest-runner/core/utils';

import {BrowserWindow, ipcMain} from 'electron';
import {getResolver} from '../utils/resolver';

const isMain = process.env.isMain === 'true';

const _runInNode = async (testData: IPCTestData): Promise<TestResult> => {
  try {
    return runTest(
      testData.path,
      testData.globalConfig,
      testData.config,
      getResolver(testData.config, testData.serialisableModuleMap),
    );
  } catch (error) {
    // eslint-disable-next-line no-console
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
  return new Promise(resolve => {
    const workerID = makeUniqWorkerId();
    const win = new BrowserWindow({
      show: false,
      webPreferences: {nodeIntegration: true, contextIsolation: false},
    });

    win.loadURL(`file://${require.resolve('../index.html')}`);
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('run-test', testData, workerID);
    });

    ipcMain.once(workerID, (event, testResult: TestResult) => {
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
  testData.config.extraGlobals || (testData.config.extraGlobals = []);
  return isMain ? _runInNode(testData) : _runInBrowserWindow(testData);
};

module.exports = {
  runTest(testData: IPCTestData): Promise<TestResult> {
    return _runTest(testData);
  },
  shutDown(): Promise<any> {
    return Promise.resolve();
  },
};

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
import runTest from 'jest-runner/build/run_test';
import docblock from '@jest-runner/core/docblock';
import fs from 'fs';

import {
  makeUniqWorkerId,
  buildFailureTestResult,
} from '@jest-runner/core/utils';

import {BrowserWindow, ipcMain} from 'electron';
import {getResolver} from '../resolver';

const _runInNode = async (testData: IPCTestData) => {
  try {
    return runTest(
      testData.path,
      testData.globalConfig,
      testData.config,
      getResolver(testData.config, testData.rawModuleMap),
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
    const win = new BrowserWindow({show: false});

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
  const parsedDocblock = docblock.parse(fs.readFileSync(testData.path, 'utf8'));
  const docblockNode = parsedDocblock.nodes.filter(
    // todo: import type DocblockNode
    (d: any) => d.name === 'jest-environment',
  )[0];

  const docblockOverride = docblockNode ? docblockNode.value : '';

  return docblockOverride === 'node'
    ? _runInNode(testData)
    : _runInBrowserWindow(testData);
};

module.exports = {
  runTest(testData: IPCTestData): Promise<TestResult> {
    return _runTest(testData);
  },
  shutDown(): Promise<any> {
    return Promise.resolve();
  },
};

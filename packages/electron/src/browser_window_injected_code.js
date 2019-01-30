/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// For some reason without 'unsafe-eval' electron runner can't read snapshot files
// and tries to write them every time it runs
window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

// react devtools only checks for the presence of a production environment
// in order to suggest downloading it, which means it logs a msg in a test environment
if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {isDisabled: true};
}

import type {IPCTestData} from '../types';

import {buildFailureTestResult} from '@jest-runner/core/utils';
import {ipcRenderer} from 'electron';
import runTest from 'jest-runner/build/runTest';
import {getResolver} from './utils/resolver';

// $FlowFixMe
const {Console} = require('console');

ipcRenderer.on(
  'run-test',
  async (event, testData: IPCTestData, workerID: string) => {
    try {
      const result = await runTest(
        testData.path,
        testData.globalConfig,
        testData.config,
        getResolver(testData.config, testData.serialisableModuleMap),
      );

      ipcRenderer.send(workerID, result);
    } catch (error) {
      ipcRenderer.send(
        workerID,
        buildFailureTestResult(
          testData.path,
          error,
          testData.config,
          testData.globalConfig,
        ),
      );
      // eslint-disable-next-line no-console
      console.error(error);
    }
  },
);

const patchConsole = () => {
  const mainConsole = new Console(process.stdout, process.stderr);
  const rendererConsole = global.console;
  const mergedConsole = {};
  Object.getOwnPropertyNames(rendererConsole)
    .filter(prop => typeof rendererConsole[prop] === 'function')
    .forEach(prop => {
      mergedConsole[prop] =
        typeof mainConsole[prop] === 'function'
          ? (...args) => {
              mainConsole[prop](...args);
              return rendererConsole[prop](...args);
            }
          : (...args) => rendererConsole[prop](...args);
    });
  delete global.console;
  global.console = mergedConsole;
};
patchConsole();

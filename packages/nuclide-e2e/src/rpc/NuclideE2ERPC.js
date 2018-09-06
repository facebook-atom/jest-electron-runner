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
import setupExpect from 'jest-circus/build/legacy_code_todo_rewrite/jest_expect';
import {
  initialize,
  runAndTransformResultsToJestFormat,
} from 'jest-circus/build/legacy_code_todo_rewrite/jest_adapter_init';
import electron from 'electron';

import {buildFailureTestResult} from '@jest-runner/core/utils';
import {BufferedConsole} from 'jest-util';

const setupConsole = () => {
  const testConsole = new BufferedConsole(() => {});
  const originalWrite = BufferedConsole.write;
  BufferedConsole.write = (...args) => {
    // make sure the stack trace still points to the original .log origin
    args[3] = 5;
    return originalWrite(...args);
  };

  const rendererConsole = global.console;
  const mergedConsole = {};
  Object.getOwnPropertyNames(rendererConsole)
    .filter(prop => typeof rendererConsole[prop] === 'function')
    .forEach(prop => {
      mergedConsole[prop] =
        typeof testConsole[prop] === 'function'
          ? (...args) => {
              testConsole[prop](...args);
              return rendererConsole[prop](...args);
            }
          : (...args) => rendererConsole[prop](...args);
    });
  delete global.console;
  global.console = mergedConsole;

  return testConsole;
};

module.exports = {
  async runTest(testData: IPCTestData): Promise<TestResult> {
    try {
      const testConsole = setupConsole();
      // $FlowFixMe
      setupExpect(testData.globalConfig);
      initialize({
        config: testData.config,
        globalConfig: testData.globalConfig,
        localRequire: require,
        parentProcess: process,
        testPath: testData.path,
      });

      const {setupTestFrameworkScriptFile} = testData.config;
      if (setupTestFrameworkScriptFile) {
        require(setupTestFrameworkScriptFile);
      }
      require(testData.path);
      const testResult = await runAndTransformResultsToJestFormat({
        config: testData.config,
        globalConfig: testData.globalConfig,
        testPath: testData.path,
      });
      testResult.console = testConsole.getBuffer();
      return testResult;
    } catch (error) {
      return Promise.resolve(
        buildFailureTestResult(
          testData.path,
          error,
          testData.config,
          testData.globalConfig,
        ),
      );
    }
  },

  async shutDown(): Promise<void> {
    setTimeout(() => electron.remote.app.quit(), 0);
    return Promise.resolve();
  },
};

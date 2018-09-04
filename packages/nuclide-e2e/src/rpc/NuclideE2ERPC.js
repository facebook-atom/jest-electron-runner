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
import run from 'jest-circus/build/run';
import setupExpect from 'jest-circus/build/legacy_code_todo_rewrite/jest_expect';
import {
  initialize,
  runAndTransformResultsToJestFormat,
} from 'jest-circus/build/legacy_code_todo_rewrite/jest_adapter_init';
import electron from 'electron';

import {buildFailureTestResult} from '@jest-runner/core/utils';

const _runTest = (testData: IPCTestData): Promise<TestResult> => {
  testData.config;
  return Promise.resolve(
    buildFailureTestResult(
      testData.path,
      new Error('lol'),
      testData.config,
      testData.globalConfig,
    ),
  );
};

module.exports = {
  async runTest(testData: IPCTestData): Promise<TestResult> {
    // $FlowFixMe
    setupExpect(testData.globalConfig);
    initialize({
      config: testData.config,
      globalConfig: testData.globalConfig,
      localRequire: require,
      parentProcess: process,
      testPath: testData.path,
    });
    require(testData.path);
    const testResult = await runAndTransformResultsToJestFormat({
      config: testData.config,
      globalConfig: testData.globalConfig,
      testPath: testData.path,
    });
    // const testResult = await run();
    setImmediate(() => {
      // electron.remote.app.quit();
    });
    return testResult;
  },
};

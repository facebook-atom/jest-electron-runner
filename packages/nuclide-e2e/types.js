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
  ProjectConfig,
  GlobalConfig,
  TestResult as TestResultBase,
} from '@jest-runner/core/types';

export type IPCTestData = {
  config: ProjectConfig,
  globalConfig: GlobalConfig,
  path: string,
};

export type TestResult = {|
  ...TestResultBase,

  // Not in Jest core. This property only added by some packages
  // in this repo.
  runID?: string,
  retriedResults?: Array<TestResult>,
|};

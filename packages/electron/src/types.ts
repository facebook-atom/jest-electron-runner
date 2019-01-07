/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// import {GlobalConfig, ProjectConfig, RawModuleMap} from '@jest-runner/core/src/types';
type RawModuleMap = any;
type ProjectConfig = any;
type GlobalConfig = any;

export type IPCTestData = {
  rawModuleMap: RawModuleMap;
  config: ProjectConfig;
  globalConfig: GlobalConfig;
  path: string;
};

export type TestRunnerTarget = 'renderer' | 'main';

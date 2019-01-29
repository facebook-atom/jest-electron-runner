/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {ProjectConfig, GlobalConfig} from '@jest-runner/core/types';

export type IPCTestData = {|
  serialisableModuleMap: Object,
  config: ProjectConfig,
  globalConfig: GlobalConfig,
  path: string,
|};

export type TestRunnerTarget = 'renderer' | 'main';

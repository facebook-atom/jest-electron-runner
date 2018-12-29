/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {TestRunnerTarget} from '../types.js';

import TestRunner from './TestRunner';

export default class TestRunnerRenderer extends TestRunner {
  getTarget(): TestRunnerTarget {
    return 'renderer';
  }
}

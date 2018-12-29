/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';

const path = require('path');
const p = relative => path.resolve(__dirname, '../', relative);

module.exports = {
  displayName: 'main',
  rootDir: p(''),
  roots: [p('')],
  testMatch: ['**/__main_process_tests__/**/*.js?(x)'],
  runner: p('packages/electron/main'),
  testRunner: require.resolve('jest-circus/runner'),
  testEnvironment: p('packages/electron/environment'),
  testPathIgnorePatterns: ['/node_modules/', 'electron_3_test_project'],
};

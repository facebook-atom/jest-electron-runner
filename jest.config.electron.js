/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */
'use strict';

const path = require('path');
const p = relative => path.resolve(__dirname, relative);

module.exports = {
  displayName: 'atom',
  rootDir: p(''),
  roots: [p('')],
  testMatch: ['**/__electron_tests__/**/*.js?(x)'],
  runner: p('atom/build/electron/index.js'),
  testRunner: require.resolve('jest-circus/runner'),
  testEnvironment: p('atom/build/environment_electron.js'),
  testPathIgnorePatterns: ['/node_modules/'],
};

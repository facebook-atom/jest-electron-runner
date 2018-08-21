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
const p = nuclidePath => path.resolve(__dirname, '..', nuclidePath);

module.exports = {
  displayName: 'atom',
  rootDir: p(''),
  roots: [p('')],
  testMatch: ['**/__atom_tests__/**/*.js?(x)'],
  transform: {
    '\\.js$': p('jest/transform.js') },

  setupTestFrameworkScriptFile: p('jest/setupTestFrameworkScriptFile.atom.js'),
  setupFiles: [p('jest/setup.js')],
  runner: p('modules/jest-atom-runner/build/index.js'),
  testRunner: require.resolve('jest-circus/runner'),
  moduleNameMapper: {
    oniguruma: p('jest/__mocks__/emptyObject.js') },

  testEnvironment: p('modules/jest-atom-runner/build/environment.js'),
  testPathIgnorePatterns: ['/node_modules/'],
  reporters: require('./reporters.config') };
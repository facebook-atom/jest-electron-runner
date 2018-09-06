/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */
'use strict';

// $FlowFixMe
const fiddleConfig = require('../fiddle/jest.json');

const path = require('path');
const p = relative => path.resolve(__dirname, '..', relative);

module.exports = {
  ...fiddleConfig,
  bail: false,
  displayName: '  fiddle',
  rootDir: p('./fiddle'),
  testPathIgnorePatterns: [
    'tests/renderer/state-spec.ts',
    'tests/renderer/app-spec.tsx',
  ],
  runner: p('packages/electron'),
  testEnvironment: p('packages/electron/environment'),
  testRunner: 'jest-circus/runner',
};

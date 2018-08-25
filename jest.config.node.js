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
const p = relative => path.resolve(__dirname, relative);

module.exports = {
  displayName: '  node  ',
  rootDir: p(''),
  roots: [p('')],
  testMatch: ['**/__tests__/**/*.js?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'node',
};

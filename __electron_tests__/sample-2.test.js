/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import jestCircus from 'jest-circus';

test('test', () => {
  expect(1).toBe(1);
  expect(jestCircus).toBeDefined();
});

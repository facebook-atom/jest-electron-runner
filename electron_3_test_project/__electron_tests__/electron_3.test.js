/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

test('uses correct version of electron', () => {
  expect(process.versions.electron).toMatch(/3.*$/);
});

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

test('test', async () => {
  expect(1).toBe(1);
  expect(window).toBeDefined();
  window.abc = 11111111111111111;
  expect(window.abc).toMatchSnapshot();
  return new Promise(r => {
    setTimeout(r, 500);
  });
});

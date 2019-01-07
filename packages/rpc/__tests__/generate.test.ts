import path from 'path';

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {prepareFiles} from '../src/generate';

test('generation logic', async () => {
  const result = await prepareFiles({
    globs: [path.resolve(__dirname, '../__fixtures__/generation/*.js')],
  });

  console.log({result});
  expect(result).toHaveLength(1);
  expect(result[0][1]).toMatchSnapshot();
});

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import yargs from 'yargs';
import {generate} from './generate';

yargs
  .usage('Usage: $0 ./path/to/rpc/methods/*.js')
  .options('RPCProcessPath', {type: 'string'});

const globs = yargs.argv._;
const {RPCProcessPath} = yargs.argv;

if (!globs.length) {
  // eslint-disable-next-line no-console
  console.error('no paths provided.');
  process.exit(1);
}

generate({globs, RPCProcessPath});

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import JestRunner from './jest_runner';
import AtomTestWorker from './AtomTestWorker';

class AtomJestRunner extends JestRunner {
  static TestWorker = AtomTestWorker;
}

module.exports = AtomJestRunner;

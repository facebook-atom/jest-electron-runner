/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import RPCConnection from '@jest-runner/rpc/RPCConnection';
import NuclideE2ERPC from '../rpc/NuclideE2ERPC';
import jestCircusGlobals from 'jest-circus';

module.exports = {
  async activate() {
    // Disable prompt to download react devtools in atom tests
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {isDisabled: true};
    Object.assign(global, jestCircusGlobals);
    const rpcConnection = new RPCConnection(NuclideE2ERPC);
    await rpcConnection.connect();
  },
  deactivate() {},
};

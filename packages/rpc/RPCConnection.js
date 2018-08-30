/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/*:: import typeof RPCConnectionType from './src/RPCConnection'; */
const RPCConnection /*: RPCConnectionType */ = require('./build/RPCConnection');

module.exports = RPCConnection;

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {validateIPCID} from './utils';
import ipc from 'node-ipc';
import {INITIALIZE_MESSAGE, JSONRPC_EVENT_NAME} from './constants';
import {
  parseRequest,
  serializeResultResponse,
  serializeErrorResponse,
} from './jsonrpc';

export default class RPCConnection<
  Methods: {[string]: (...Args: any) => Promise<any>},
> {
  methods: Methods;

  constructor(methods: Methods) {
    this.methods = methods;
  }

  async connect(serverID?: string) {
    return new Promise(resolve => {
      serverID || (serverID = validateIPCID(process.env.JEST_SERVER_ID));
      ipc.config.id = serverID;
      ipc.config.silent = true;
      ipc.config.retry = 1500;

      ipc.connectTo(serverID, () => {
        ipc.of[serverID].on('connect', () => {
          ipc.of[serverID].emit(INITIALIZE_MESSAGE);
        });

        ipc.of[serverID].on(JSONRPC_EVENT_NAME, data => {
          const {method, params, id} = parseRequest(data);
          this.methods[method]
            .apply(null, params)
            .then(result => {
              ipc.of[serverID].emit(
                JSONRPC_EVENT_NAME,
                serializeResultResponse(result, id),
              );
            })
            .catch(error => {
              ipc.of[serverID].emit(
                JSONRPC_EVENT_NAME,
                serializeErrorResponse(error, id),
              );
            });
        });

        resolve();
      });
    });
  }
}

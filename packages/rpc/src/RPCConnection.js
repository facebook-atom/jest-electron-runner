/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {validateIPCID} from './utils';
import {IPC} from 'node-ipc';
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
  _ipc: IPC;

  constructor(methods: Methods) {
    this.methods = methods;
    this._ipc = new IPC();
  }

  async connect(_serverID?: string) {
    return new Promise(resolve => {
      const serverID = _serverID || validateIPCID(process.env.JEST_SERVER_ID);
      this._ipc.config.id = serverID;
      this._ipc.config.silent = true;
      this._ipc.config.retry = 1500;

      this._ipc.connectTo(serverID, () => {
        this._ipc.of[serverID].on('connect', () => {
          this._ipc.of[serverID].emit(INITIALIZE_MESSAGE);
        });

        this._ipc.of[serverID].on(JSONRPC_EVENT_NAME, data => {
          const {method, params, id} = parseRequest(data);
          this.methods[method]
            .apply(null, params)
            .then(result => {
              this._ipc.of[serverID].emit(
                JSONRPC_EVENT_NAME,
                serializeResultResponse(result, id),
              );
            })
            .catch(error => {
              this._ipc.of[serverID].emit(
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

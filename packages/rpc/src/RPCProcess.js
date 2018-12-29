/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/* global child_process$ChildProcess */

import type {ServerID} from './utils';
import {spawn} from 'child_process';
import {makeUniqServerId} from './utils';
import path from 'path';
import {INITIALIZE_MESSAGE, JSONRPC_EVENT_NAME} from './constants';
import {IPC} from 'node-ipc';
import {serializeRequest, parseResponse} from './jsonrpc';

type SpawnFn = ({serverID: ServerID}) => child_process$ChildProcess;
type SpawnNode = {|
  useBabel?: boolean,
  initFile: string,
|};

type ConstructorOptions =
  | {|
      spawn: SpawnFn,
    |}
  | {|spawnNode: SpawnNode|};

export default class RPCProcess<Methods> {
  _ipc: IPC;
  server: Object;
  serverID: ServerID;
  isAlive: boolean;
  _spawn: SpawnFn;
  remote: Methods;
  _socket: any;
  _pendingRequests: {[string]: {resolve: Function, reject: Function}};
  _subprocess: child_process$ChildProcess;

  constructor(options: ConstructorOptions) {
    this.serverID = makeUniqServerId();
    this.isAlive = false;
    this._ipc = new IPC();

    this._spawn = options.spawnNode
      ? makeSpawnNodeFn(this.serverID, options.spawnNode)
      : options.spawn;
    this.remote = this.initializeRemote();
    this._pendingRequests = {};
  }

  initializeRemote(): Methods {
    throw new Error('not implemented');
  }

  async start(): Promise<void> {
    this._ipc.config.id = this.serverID;
    this._ipc.config.retry = 1500;
    this._ipc.config.silent = true;

    this._subprocess = this._spawn({serverID: this.serverID});
    const socket = await new Promise(async resolve => {
      this._ipc.serve(() => {
        this._ipc.server.on(INITIALIZE_MESSAGE, (message, socket) => {
          this.server = this._ipc.server;
          this.isAlive = true;
          resolve(socket);
        });

        this._ipc.server.on(JSONRPC_EVENT_NAME, json => {
          this.handleJsonRPCResponse(json);
        });
      });
      this._ipc.server.start();
    });

    this._socket = socket;
  }

  stop() {
    this.server && this.server.stop();
    if (this._subprocess && this.isAlive) {
      try {
        process.kill(-this._subprocess.pid, 'SIGKILL');
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    this._subprocess.kill('SIGKILL');
    delete this.server;
    this.isAlive = false;
  }

  async jsonRPCCall(method: string, ...args: Array<any>) {
    this._ensureServerStarted();
    return new Promise((resolve, reject) => {
      const {id, json} = serializeRequest(method, [...args]);
      this.server.emit(this._socket, JSONRPC_EVENT_NAME, json);
      this._pendingRequests[id] = {
        resolve: data => {
          delete this._pendingRequests[id];
          resolve(data);
        },
        reject: error => {
          delete this._pendingRequests[id];
          reject(new Error(`${error.code}:${error.message}\n${error.data}`));
        },
      };
    });
  }

  handleJsonRPCResponse(json: string) {
    const response = parseResponse(json);
    const {id, result, error} = response;

    if (error) {
      this._pendingRequests[id].reject(error);
    } else {
      this._pendingRequests[id].resolve(result);
    }
  }

  _ensureServerStarted() {
    if (!this.server) {
      throw new Error(`
        RPCProcess need to be started before making any RPC calls.
        e.g.:
        --------
        const rpcProcess = new MyRPCProcess(options);
        await rpcProcess.start();
        const result = rpcProcess.remote.doSomething();
      `);
    }
  }
}

const getBabelNodeBin = () =>
  path.resolve(__dirname, '../../../node_modules/.bin/babel-node');

const makeSpawnNodeFn = (serverID, {initFile, useBabel}): SpawnFn => {
  return () => {
    const bin = useBabel ? getBabelNodeBin() : 'node';

    return spawn(bin, [initFile], {
      stdio: ['inherit', process.stderr, 'inherit'],
      env: {
        ...process.env,
        JEST_SERVER_ID: serverID,
      },
      detached: true,
    });
  };
};

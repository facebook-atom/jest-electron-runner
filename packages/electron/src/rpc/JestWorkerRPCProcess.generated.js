/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated c0032ec975761367b96aeb76fc7c7b5c
 */

import typeof Methods from './JestWorkerRPC.js';

import {RPCProcess} from '@jest-runner/rpc';

class JestWorkerRPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      runTest: (this.jsonRPCCall.bind(this, 'runTest'): any),
      shutDown: (this.jsonRPCCall.bind(this, 'shutDown'): any),
    };
  }
}
module.exports = JestWorkerRPCProcess;

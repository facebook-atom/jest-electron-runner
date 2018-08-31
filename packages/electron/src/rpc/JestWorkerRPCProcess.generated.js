/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated 65cf6e68c243bb4f0ab6c32d61b6f5a4
 */

import typeof Methods from './JestWorkerRPC.js';
import RPCProcess from '@jest-runner/rpc/RPCProcess';

class JestWorkerRPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      runTest: (this.jsonRPCCall.bind(this, 'runTest'): any),
      shutDown: (this.jsonRPCCall.bind(this, 'shutDown'): any),
    };
  }
}
module.exports = JestWorkerRPCProcess;

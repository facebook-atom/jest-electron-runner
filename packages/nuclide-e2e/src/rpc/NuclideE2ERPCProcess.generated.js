/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated 57973369989f6063f0ce4b43d9e73d12
 */

import typeof Methods from './NuclideE2ERPC.js';

import {RPCProcess} from '@jest-runner/rpc';

class NuclideE2ERPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      runTest: (this.jsonRPCCall.bind(this, 'runTest'): any),
      shutDown: (this.jsonRPCCall.bind(this, 'shutDown'): any),
    };
  }
}
module.exports = NuclideE2ERPCProcess;

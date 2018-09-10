/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated c98e0eea63c67fda1d3edf6cf1c6610e
 */

import typeof Methods from './NuclideE2ERPC.js';
import RPCProcess from '@jest-runner/rpc/RPCProcess';

class NuclideE2ERPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      runTest: (this.jsonRPCCall.bind(this, 'runTest'): any),
      shutDown: (this.jsonRPCCall.bind(this, 'shutDown'): any),
    };
  }
}
module.exports = NuclideE2ERPCProcess;

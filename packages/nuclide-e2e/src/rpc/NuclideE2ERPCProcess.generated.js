/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated 151ec46721ad742e15fa5af1641152ea
 */

import typeof Methods from './NuclideE2ERPC.js';
import RPCProcess from '@jest-runner/rpc/RPCProcess';

class NuclideE2ERPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      runTest: (this.jsonRPCCall.bind(this, 'runTest'): any),
    };
  }
}
module.exports = NuclideE2ERPCProcess;

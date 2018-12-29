/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated 3c975322c9bc805c14ea946b350e7755
 */

import typeof Methods from './JestWorkerRPCMain.js';
import RPCProcess from '@jest-runner/rpc/RPCProcess';

class JestWorkerRPCMainProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      runTest: (this.jsonRPCCall.bind(this, 'runTest'): any),
      shutDown: (this.jsonRPCCall.bind(this, 'shutDown'): any),
    };
  }
}
module.exports = JestWorkerRPCMainProcess;

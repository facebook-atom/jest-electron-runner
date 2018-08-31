/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated 7833ceae345a7da8ac00ffdbd388cf11
 */

import typeof Methods from './SimpleRPC.js';
import RPCProcess from '../../RPCProcess.js';

class SimpleRPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      hello: (this.jsonRPCCall.bind(this, 'hello'): any),
      thisWillFail: (this.jsonRPCCall.bind(this, 'thisWillFail'): any),
      multipleArgs: (this.jsonRPCCall.bind(this, 'multipleArgs'): any),
    };
  }
}
module.exports = SimpleRPCProcess;

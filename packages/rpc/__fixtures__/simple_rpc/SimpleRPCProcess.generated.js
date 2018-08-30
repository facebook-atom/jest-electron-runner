/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @flow
 * @generated 88dd0a22386387888561c486fe8f022d
 */

import typeof Methods from './SimpleRPC.js';
import RPCProcess from '../../RPCProcess.js';

class SimpleRPCProcess extends RPCProcess<Methods> {
  initializeRemote(): Methods {
    return {
      hello: (this.jsonRPCCall.bind(this, 'hello'): any),
      thisWillFail: (this.jsonRPCCall.bind(this, 'thisWillFail'): any),
    };
  }
}
module.exports = SimpleRPCProcess;

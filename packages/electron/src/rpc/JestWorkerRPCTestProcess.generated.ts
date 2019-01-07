/**
 * ****************************************************
 * THIS IS A GENERATED FILE. DO NOT MODIFY IT MANUALLY!
 * ****************************************************
 * @generated 9b1369697ba4c39fc1af26e64000cd1c
 */

// @ts-ignore until module is typed
import {RPCProcess} from '@jest-runner/rpc';

type Methods = any;

class JestWorkerRPCTestProcess extends RPCProcess<Methods> {
  jsonRPCCall: any;
  initializeRemote(): Methods {
    return {
      runTest: this.jsonRPCCall.bind(this, 'runTest'),
      shutDown: this.jsonRPCCall.bind(this, 'shutDown'),
    };
  }
}
export default JestWorkerRPCTestProcess;

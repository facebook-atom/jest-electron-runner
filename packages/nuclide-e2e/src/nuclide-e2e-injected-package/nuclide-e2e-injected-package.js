import RPCConnection from '@jest-runner/rpc/RPCConnection';
import NuclideE2ERPC from '../rpc/NuclideE2ERPC';
import jestCircusGlobals from 'jest-circus';

module.exports = {
  async activate() {
    Object.assign(global, jestCircusGlobals);
    const rpcConnection = new RPCConnection(NuclideE2ERPC);
    await rpcConnection.connect();
  },
  deactivate() {},
};

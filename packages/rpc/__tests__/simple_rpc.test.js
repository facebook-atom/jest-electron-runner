/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import path from 'path';
import SimpleRPCPRocess from '../__fixtures__/simple_rpc/SimpleRPCProcess.generated';

let processes = [];
afterEach(() => {
  for (const p of processes) {
    p.stop();
  }
  processes = [];
});

// to regenerate run:
// node build/cli.js --RPCProcessPath='./RPCProcess.js' __fixtures__/simple_rpc/SimpleRPC.js
test('can run remote commands', async () => {
  const childProcessPath = path.resolve(
    __dirname,
    '../__fixtures__/simple_rpc/child_process.js',
  );

  const simpleRPCProcess = new SimpleRPCPRocess({
    spawnNode: {
      useBabel: true,
      initFile: childProcessPath,
    },
  });

  processes.push(simpleRPCProcess);

  expect(simpleRPCProcess.remote.hello('lol')).rejects.toThrowError(/started/);
  await simpleRPCProcess.start();
  const result = await simpleRPCProcess.remote.hello('lol');
  expect(result).toBe('hello lol');
  await expect(simpleRPCProcess.remote.thisWillFail()).rejects.toThrowError(
    /hi!/,
  );
  expect(await simpleRPCProcess.remote.multipleArgs(1, 'a')).toEqual([1, 'a']);
});

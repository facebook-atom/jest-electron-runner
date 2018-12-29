/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {GlobalConfig} from '@jest-runner/core/types';
import JestWorkerRpcMainProcess from '../rpc/JestWorkerRPCMainProcess.generated';
import {getElectronBin} from './getElectronBin';
import {spawn} from 'child_process';

export const spawnRpcProcess = ({
  globalConfig,
  isMain = false,
}: {
  globalConfig: GlobalConfig,
  isMain: boolean,
}) => {
  return new JestWorkerRpcMainProcess({
    spawn: ({serverID}) => {
      const injectedCodePath = require.resolve(
        '../electron_process_injected_code.js',
      );
      const currentNodeBinPath = process.execPath;
      const electronBin = getElectronBin(globalConfig.rootDir);

      return spawn(currentNodeBinPath, [electronBin, injectedCodePath], {
        stdio: [
          'inherit',
          // redirect child process' stdout to parent process stderr, so it
          // doesn't break any tools that depend on stdout (like the ones
          // that consume a generated JSON report from jest's stdout)
          process.stderr,
          'inherit',
        ],
        env: {
          ...process.env,
          isMain,
          JEST_SERVER_ID: serverID,
        },
        detached: true,
      });
    },
  });
};

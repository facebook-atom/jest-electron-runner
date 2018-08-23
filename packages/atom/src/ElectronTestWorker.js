/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import TestWorker from './TestWorker';
import path from 'path';
import os from 'os';
import {spawn} from 'child_process';
import fs from 'fs';
import mkdirp from 'mkdirp';

export default class AtomTestWorker extends TestWorker {
  spawnSubprocess() {
    const {_serverID: serverID, _workerID: workerID} = this;
    const injectedCodePath = require.resolve('./electron_injected_code.js');
    return spawn('electron', ['-r', injectedCodePath], {
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
        JEST_SERVER_ID: serverID,
        JEST_WORKER_ID: workerID,
      },
    });
  }
}

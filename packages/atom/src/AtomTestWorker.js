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

const TMP_DIR = path.resolve(os.tmpdir(), 'jest-atom-runner');

// Atom resolves to its testing framework based on what's specified
// under the "atomTestRunner" key in the package.json in the parent directory
// of the first passed path.
// so if we run `atom -t /some_dir/__tests__/1-test.js`
// it'll look up `/some_dir/package.json` and then require whatever file is
// specified in "atomTestRunner" of this packages.json.
// To work around (or rather make atom execute arbitrary code) we
// will create a dummy `/tmp/packages.json` with `atomTestRunner` pointing
// to the file that we want to inject into atom's runtime.
const createDummyPackageJson = () => {
  mkdirp.sync(path.resolve(TMP_DIR));
  const packageJsonPath = path.resolve(TMP_DIR, 'package.json');
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({atomTestRunner: require.resolve('./atomTestRunner')}),
  );
};

export default class AtomTestWorker extends TestWorker {
  spawnSubprocess() {
    createDummyPackageJson();
    const atomPathArg = path.resolve(TMP_DIR);
    const {_serverID: serverID, _workerID: workerID} = this;
    return spawn('atom', ['-t', atomPathArg], {
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

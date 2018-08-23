'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _extends = Object.assign || function (target) {for (var i = 1; i < arguments.length; i++) {var source = arguments[i];for (var key in source) {if (Object.prototype.hasOwnProperty.call(source, key)) {target[key] = source[key];}}}return target;}; /**
                                                                                                                                                                                                                                                                                                                                    * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
                                                                                                                                                                                                                                                                                                                                    *
                                                                                                                                                                                                                                                                                                                                    * This source code is licensed under the MIT license found in the
                                                                                                                                                                                                                                                                                                                                    * LICENSE file in the root directory of this source tree.
                                                                                                                                                                                                                                                                                                                                    *
                                                                                                                                                                                                                                                                                                                                    *  strict-local
                                                                                                                                                                                                                                                                                                                                    * @format
                                                                                                                                                                                                                                                                                                                                    */

var _TestWorker = require('./TestWorker');var _TestWorker2 = _interopRequireDefault(_TestWorker);
var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _os = require('os');var _os2 = _interopRequireDefault(_os);
var _child_process = require('child_process');
var _fs = require('fs');var _fs2 = _interopRequireDefault(_fs);
var _mkdirp = require('mkdirp');var _mkdirp2 = _interopRequireDefault(_mkdirp);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const TMP_DIR = _path2.default.resolve(_os2.default.tmpdir(), 'jest-atom-runner');

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
  _mkdirp2.default.sync(_path2.default.resolve(TMP_DIR));
  const packageJsonPath = _path2.default.resolve(TMP_DIR, 'package.json');
  _fs2.default.writeFileSync(
  packageJsonPath,
  JSON.stringify({ atomTestRunner: require.resolve('./atomTestRunner') }));

};

class AtomTestWorker extends _TestWorker2.default {
  spawnSubprocess() {
    createDummyPackageJson();
    const atomPathArg = _path2.default.resolve(TMP_DIR);
    const { _serverID: serverID, _workerID: workerID } = this;
    return (0, _child_process.spawn)('atom', ['-t', atomPathArg], {
      stdio: [
      'inherit',
      // redirect child process' stdout to parent process stderr, so it
      // doesn't break any tools that depend on stdout (like the ones
      // that consume a generated JSON report from jest's stdout)
      process.stderr,
      'inherit'],

      env: _extends({},
      process.env, {
        JEST_SERVER_ID: serverID,
        JEST_WORKER_ID: workerID }) });


  }}exports.default = AtomTestWorker;
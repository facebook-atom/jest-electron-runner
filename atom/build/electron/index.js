'use strict';













var _ipcServer = require('../ipc-server');
var _utils = require('../utils');
var _ElectronProcess = require('./ElectronProcess');var _ElectronProcess2 = _interopRequireDefault(_ElectronProcess);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

// Share ipc server and farm between multiple runs, so we don't restart
// the whole thing in watch mode every time. (it steals window focus when
// atom launches)
/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *  strict-local
 * @format
 */let ipcServerPromise;let serverID;let electronProcess;let cleanupRegistered = false;class TestRunner {

  constructor(globalConfig) {
    this._globalConfig = globalConfig;
    serverID = serverID || (serverID = (0, _utils.makeUniqServerId)());
    this._serverID = serverID;
    ipcServerPromise || (
    ipcServerPromise = (0, _ipcServer.startServer)({
      serverID: this._serverID }));

  }

  async runTests(
  tests,
  watcher,
  onStart,
  onResult,
  onFailure,
  options)
  {
    const isWatch = this._globalConfig.watch || this._globalConfig.watchAll;
    const concurrency = isWatch ?
    1 :
    Math.min(tests.length, this._globalConfig.maxWorkers);
    const ipcServer = await ipcServerPromise;

    if (!electronProcess) {
      electronProcess = new _ElectronProcess2.default({
        serverID: this._serverID,
        ipcServer: await ipcServer,
        globalConfig: this._globalConfig,
        concurrency });

      await electronProcess.start();
    }

    const cleanup = async () => {
      electronProcess.stop();
      ipcServer.stop();
    };

    if (!cleanupRegistered) {
      cleanupRegistered = true;
      process.on('exit', cleanup);
      process.on('SIGINT', cleanup);
      process.on('SIGUSR1', cleanup);
      process.on('SIGUSR2', cleanup);
      process.on('uncaughtException', cleanup);
    }

    await Promise.all(
    tests.map(test => {
      return electronProcess.
      runTest(test, onStart).
      then(testResult => onResult(test, testResult)).
      catch(error => onFailure(test, error));
    }));


    if (!isWatch) {
      cleanup();
    }
  }}


module.exports = TestRunner;
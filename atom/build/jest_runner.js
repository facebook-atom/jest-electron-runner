'use strict';Object.defineProperty(exports, "__esModule", { value: true });



















var _ipcServer = require('./ipc-server');
var _utils = require('./utils');

var _TestWorkerFarm = require('./TestWorkerFarm');var _TestWorkerFarm2 = _interopRequireDefault(_TestWorkerFarm);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}



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
 */ /* This is the main file that Jest will specify in its config as
     * 'runner': 'path/to/this/file'
     */ /* eslint-disable nuclide-internal/no-commonjs */let ipcServerPromise;let serverID;let farm;let cleanupRegistered = false;class TestRunner {

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
    // spawning multiple atoms in watch mode is weird,
    // they all try to steal focus from the current window
    1 :
    Math.min(tests.length, this._globalConfig.maxWorkers);
    const ipcServer = await ipcServerPromise;

    if (!farm) {
      const { TestWorker } = this.constructor;
      const TestWorkerFarmClass =
      this.constructor.TestWorkerFarm || _TestWorkerFarm2.default;
      (0, _utils.invariant)(TestWorker);
      farm = new TestWorkerFarmClass({
        serverID: this._serverID,
        ipcServer: await ipcServer,
        globalConfig: this._globalConfig,
        concurrency,
        TestWorker });

      await farm.start();
    }

    const cleanup = async () => {
      farm.stop();
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
      return farm.
      runTest(test, onStart).
      then(testResult => onResult(test, testResult)).
      catch(error => onFailure(test, error));
    }));


    if (!isWatch) {
      cleanup();
    }
  }}exports.default = TestRunner;
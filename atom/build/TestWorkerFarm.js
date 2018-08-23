'use strict';Object.defineProperty(exports, "__esModule", { value: true });

















class TestWorkerFarm {








  constructor({
    ipcServer,
    serverID,
    globalConfig,
    concurrency,
    TestWorker })






  {
    if (concurrency < 1) {
      throw new Error(
      `concurrency has to be greater than 1, given: ${concurrency}`);

    }
    this._workers = [];
    this._queue = [];
    for (let i = 0; i < concurrency; i++) {
      const worker = new TestWorker({ ipcServer, serverID, globalConfig });
      this._workers.push(worker);
    }
  }

  async start() {
    await Promise.all(this._workers.map(w => w.start())).then(results =>
    results.forEach(() => this._processNext()));

  }

  async stop() {
    await Promise.all(this._workers.map(w => w.stop()));
  }

  _processNext() {
    const availableWorker = this._workers.find(w => !w.isBusy());
    if (availableWorker) {
      const nextInQueue = this._queue.shift();
      if (nextInQueue) {
        nextInQueue.onStart(nextInQueue.test);
        availableWorker.
        runTest(nextInQueue.test).
        then(testResult => {
          nextInQueue.resolve(testResult);
          this._processNext();
        }).
        catch(error => {
          nextInQueue.reject(error);
          this._processNext();
        });
      }
    }
  }

  runTest(test, onStart) {
    return new Promise((resolve, reject) => {
      this._queue.push({ test, resolve, reject, onStart });
      this._processNext();
    });
  }}exports.default = TestWorkerFarm; /**
                                       * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
                                       *
                                       * This source code is licensed under the MIT license found in the
                                       * LICENSE file in the root directory of this source tree.
                                       *
                                       *  strict-local
                                       * @format
                                       */ /* An abstraction that acts as a sempaphore for Atom workers. */
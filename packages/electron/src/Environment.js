/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import mock from 'jest-mock';

export default class ElectronEnvironment {
  global: Object;
  moduleMocker: Object;
  fakeTimers: Object;

  constructor() {
    this.global = global;
    this.moduleMocker = new mock.ModuleMocker(global);
    this.fakeTimers = {
      useFakeTimers() {
        throw new Error('fakeTimers are not supproted in atom environment');
      },
    };
  }

  async setup() {}

  async teardown() {}

  runScript(script: any): ?any {
    // Since evrey tests runs in a new window we don't need any extra isolation
    // as we need in Jest node runner
    return script.runInThisContext();
  }
}

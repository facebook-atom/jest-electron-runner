/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

module.exports = {
  hello(name: string): Promise<string> {
    return Promise.resolve(`hello ${name}`);
  },
  thisWillFail(): Promise<any> {
    return Promise.reject(new Error('hi!'));
  },
  multipleArgs(a: number, b: string): Promise<[number, string]> {
    return Promise.resolve([a, b]);
  },
};

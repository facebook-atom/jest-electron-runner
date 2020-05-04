/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type GlobalConfig = {
  rootDir: string,
  expand: boolean,
  maxWorkers: number,
  verbose: boolean,
  watch: boolean,
  watchAll: boolean,
};
export type ProjectConfig = {
  extraGlobals: Array<string>,
  globals?: Object,
  name: string,
  rootDir: string,
  setupFiles: Array<string>,
  setupTestFrameworkScriptFile: ?string,
};
export type Resolver = {};
export type RawModuleMap = {};

export type Context = {
  moduleMap: {
    toJSON(): Object,
  },
  config: ProjectConfig,
};
export type Test = {
  context: Context,
  path: string,
  config: ProjectConfig,
};

export type Watcher = any;

export type TestResult = {|
  console: ?Array<any>,
  failureMessage: ?string,
  numFailingTests: number,
  numPassingTests: number,
  numPendingTests: number,
  perfStats: {end: number, start: number},
  snapshot: {
    added: number,
    fileDeleted: boolean,
    matched: number,
    unchecked: number,
    unmatched: number,
    updated: number,
    uncheckedKeys: Array<any>,
  },
  testFilePath: string,
  testResults: Array<{
    ancestorTitles: Array<string>,
    duration: number,
    failureMessages: Array<any>,
    fullName: string,
    location: any,
    numPassingAsserts: number,
    status: 'passed' | 'failed' | 'skipped',
    title: string,
  }>,
  sourceMaps: {},
  skipped: boolean,
  displayName: string,
  leaks: boolean,
  testExecError: ?string,
|};

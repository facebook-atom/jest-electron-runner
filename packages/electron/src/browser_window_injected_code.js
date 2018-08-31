/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// For some reason without 'unsafe-eval' electron runner can't read snapshot files
// and tries to write them every time it runs
window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

import type {IPCTestData} from '../types';

import {buildFailureTestResult} from '@jest-runner/core/utils';
import {ipcRenderer} from 'electron';
import HasteMap from 'jest-haste-map';
import runTest from 'jest-runner/build/run_test';
import Runtime from 'jest-runtime';

// $FlowFixMe
const {Console} = require('console');

ipcRenderer.on(
  'run-test',
  async (event, testData: IPCTestData, workerID: string) => {
    try {
      const result = await runTest(
        testData.path,
        testData.globalConfig,
        testData.config,
        getResolver(testData.config, testData.rawModuleMap),
      );

      ipcRenderer.send(workerID, result);
    } catch (error) {
      ipcRenderer.send(
        workerID,
        buildFailureTestResult(
          testData.path,
          error,
          testData.config,
          testData.globalConfig,
        ),
      );
      // eslint-disable-next-line no-console
      console.error(error);
    }
  },
);

const ATOM_BUILTIN_MODULES = new Set(['atom', 'electron']);

// Atom has builtin modules that can't go through jest transforme/cache
// pipeline. There's no easy way to add custom modules to jest, so we'll wrap
// jest Resolver object and make it bypass atom's modules.
const wrapResolver = resolver => {
  const isCoreModule = resolver.isCoreModule;
  const resolveModule = resolver.resolveModule;

  resolver.isCoreModule = moduleName => {
    if (ATOM_BUILTIN_MODULES.has(moduleName)) {
      return true;
    } else {
      return isCoreModule.call(resolver, moduleName);
    }
  };

  resolver.resolveModule = (from, to, options) => {
    if (ATOM_BUILTIN_MODULES.has(to)) {
      return to;
    } else {
      return resolveModule.call(resolver, from, to, options);
    }
  };

  return resolver;
};

const resolvers = Object.create(null);
const getResolver = (config, rawModuleMap) => {
  // In watch mode, the raw module map with all haste modules is passed from
  // the test runner to the watch command. This is because jest-haste-map's
  // watch mode does not persist the haste map on disk after every file change.
  // To make this fast and consistent, we pass it from the TestRunner.
  if (rawModuleMap) {
    return wrapResolver(
      Runtime.createResolver(config, new HasteMap.ModuleMap(rawModuleMap)),
    );
  } else {
    const name = config.name;
    if (!resolvers[name]) {
      resolvers[name] = wrapResolver(
        Runtime.createResolver(
          config,
          Runtime.createHasteMap(config).readModuleMap(),
        ),
      );
    }
    return resolvers[name];
  }
};

const patchConsole = () => {
  const mainConsole = new Console(process.stdout, process.stderr);
  const rendererConsole = global.console;
  const mergedConsole = {};
  Object.getOwnPropertyNames(rendererConsole)
    .filter(prop => typeof rendererConsole[prop] === 'function')
    .forEach(prop => {
      mergedConsole[prop] =
        typeof mainConsole[prop] === 'function'
          ? (...args) => {
              mainConsole[prop](...args);
              return rendererConsole[prop](...args);
            }
          : (...args) => rendererConsole[prop](...args);
    });
  delete global.console;
  global.console = mergedConsole;
};
patchConsole();

'use strict';








var _run_test = require('jest-runner/build/run_test');var _run_test2 = _interopRequireDefault(_run_test);
var _jestRuntime = require('jest-runtime');var _jestRuntime2 = _interopRequireDefault(_jestRuntime);
var _jestHasteMap = require('jest-haste-map');var _jestHasteMap2 = _interopRequireDefault(_jestHasteMap);

var _electron = require('electron');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                   * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
                                                                                                                                   *
                                                                                                                                   * This source code is licensed under the MIT license found in the
                                                                                                                                   * LICENSE file in the root directory of this source tree.
                                                                                                                                   *
                                                                                                                                   * 
                                                                                                                                   * @format
                                                                                                                                   */_electron.ipcRenderer.on('run-test', async (event, { testData, workerID }) => {try {const result = await (0, _run_test2.default)(testData.path, testData.globalConfig, testData.config, getResolver(testData.config, testData.rawModuleMap));


    _electron.ipcRenderer.send(workerID, result);
  } catch (e) {
    console.error(e);
  }
}); // $FlowFixMe

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
    _jestRuntime2.default.createResolver(config, new _jestHasteMap2.default.ModuleMap(rawModuleMap)));

  } else {
    const name = config.name;
    if (!resolvers[name]) {
      resolvers[name] = wrapResolver(
      _jestRuntime2.default.createResolver(
      config,
      _jestRuntime2.default.createHasteMap(config).readModuleMap()));


    }
    return resolvers[name];
  }
};
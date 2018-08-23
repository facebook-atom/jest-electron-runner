'use strict';











var _os = require('os');var _os2 = _interopRequireDefault(_os);
var _run_test = require('jest-runner/build/run_test');var _run_test2 = _interopRequireDefault(_run_test);
var _jestRuntime = require('jest-runtime');var _jestRuntime2 = _interopRequireDefault(_jestRuntime);
var _jestHasteMap = require('jest-haste-map');var _jestHasteMap2 = _interopRequireDefault(_jestHasteMap);

var _console = require('console');




















var _utils = require('./utils');






var _ipcClient = require('./ipc-client');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                        * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
                                                                                                                                        *
                                                                                                                                        * This source code is licensed under the MIT license found in the
                                                                                                                                        * LICENSE file in the root directory of this source tree.
                                                                                                                                        *
                                                                                                                                        * 
                                                                                                                                        * @format
                                                                                                                                        */const patchAtomConsole = () => {const mainConsole = new _console.Console(process.stdout, process.stderr);const rendererConsole = global.console;const mergedConsole = {};Object.getOwnPropertyNames(rendererConsole).filter(prop => typeof rendererConsole[prop] === 'function').forEach(prop => {mergedConsole[prop] = typeof mainConsole[prop] === 'function' ? (...args) => {mainConsole[prop](...args);return rendererConsole[prop](...args);} : (...args) => rendererConsole[prop](...args);});delete global.console;global.console = mergedConsole;}; // $FlowFixMe
const ATOM_BUILTIN_MODULES = new Set(['atom', 'electron']);process.on('uncaughtException', err => {console.error(err.stack);process.exit(1);});






const run = async () => {
  patchAtomConsole();

  const { serverID, workerID } = (0, _utils.getIPCIDs)();
  const connection = await (0, _ipcClient.connectToIPCServer)({
    serverID,
    workerID });


  return new Promise((resolve, reject) => {
    connection.onMessage(message => {
      try {
        const { messageType, data } = (0, _utils.parseMessage)(message);

        switch (messageType) {
          case _utils.MESSAGE_TYPES.RUN_TEST:{
              const testData = (0, _utils.parseJSON)(data);
              (0, _run_test2.default)(
              testData.path,
              testData.globalConfig,
              testData.config,
              getResolver(testData.config, testData.rawModuleMap)).

              catch(error => {
                const testResult = (0, _utils.buildFailureTestResult)(
                testData.path,
                error,
                testData.config,
                testData.globalConfig);

                return testResult;
              }).
              then(result => {
                const msg = (0, _utils.makeMessage)({
                  messageType: _utils.MESSAGE_TYPES.TEST_RESULT,
                  data: JSON.stringify(result) });

                connection.send(msg);
              });
              break;
            }
          case _utils.MESSAGE_TYPES.SHUT_DOWN:{
              resolve();
              connection.disconnect();
              process.exit(0);
              break;
            }}

      } catch (e) {
        console.error(e);
      }
    });
  }).catch(e => {
    console.error(e);
    throw e;
  });
};

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

run().
then(() => {
  console.error('done');
}).
catch(e => {
  console.error('Error', e);
});
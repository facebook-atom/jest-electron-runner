/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {IPCWorker} from './ipc-client';

import os from 'os';
import runTest from 'jest-runner/build/run_test';
import Runtime from 'jest-runtime';
import HasteMap from 'jest-haste-map';
// $FlowFixMe
import {Console} from 'console';

const patchAtomConsole = () => {
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

import {
  parseMessage,
  MESSAGE_TYPES,
  parseJSON,
  makeMessage,
  buildFailureTestResult,
} from './utils';
import {connectToIPCServer} from './ipc-client';
import {getIPCIDs} from './utils';

const ATOM_BUILTIN_MODULES = new Set(['atom', 'electron']);

process.on('uncaughtException', err => {
  console.error(err.stack);
  process.exit(1);
});

export type AtomParams = {
  testPaths: Array<string>,
  buildAtomEnvironment: any,
  buildDefaultApplicationDelegate: any,
};

const run = async () => {
  patchAtomConsole();

  const {serverID, workerID} = getIPCIDs();
  const connection: IPCWorker = await connectToIPCServer({
    serverID,
    workerID,
  });

  return new Promise((resolve, reject) => {
    connection.onMessage(message => {
      try {
        const {messageType, data} = parseMessage(message);

        switch (messageType) {
          case MESSAGE_TYPES.RUN_TEST: {
            const testData = parseJSON(data);
            runTest(
              testData.path,
              testData.globalConfig,
              testData.config,
              getResolver(testData.config, testData.rawModuleMap),
            )
              .catch(error => {
                const testResult = buildFailureTestResult(
                  testData.path,
                  error,
                  testData.config,
                  testData.globalConfig,
                );
                return testResult;
              })
              .then(result => {
                const msg = makeMessage({
                  messageType: MESSAGE_TYPES.TEST_RESULT,
                  data: JSON.stringify(result),
                });
                connection.send(msg);
              });
            break;
          }
          case MESSAGE_TYPES.SHUT_DOWN: {
            resolve();
            connection.disconnect();
            process.exit(0);
            break;
          }
        }
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

run()
  .then(() => {
    console.error('done');
  })
  .catch(e => {
    console.error('Error', e);
  });

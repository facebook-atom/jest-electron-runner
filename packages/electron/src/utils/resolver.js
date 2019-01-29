/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ProjectConfig} from '@jest-runner/core/types';

import Runtime from 'jest-runtime';
import HasteMap from 'jest-haste-map';

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
export const getResolver = (
  config: ProjectConfig,
  serializableModuleMap: Object,
) => {
  // In watch mode, the raw module map with all haste modules is passed from
  // the test runner to the watch command. This is because jest-haste-map's
  // watch mode does not persist the haste map on disk after every file change.
  // To make this fast and consistent, we pass it from the TestRunner.
  if (serializableModuleMap) {
    const moduleMap = serializableModuleMap
      ? HasteMap.ModuleMap.fromJSON(serializableModuleMap)
      : null;
    return wrapResolver(
      Runtime.createResolver(config, new HasteMap.ModuleMap(moduleMap)),
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

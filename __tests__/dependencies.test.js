/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import glob from 'glob';
import path from 'path';
import fs from 'fs';

const blockCommentRe = /\/\*[^]*?\*\//g;
const lineCommentRe = /\/\/.*/g;

const IMPORT_RE = /(\bimport\s+(?!type )(?:[^'"]+\s+from\s+)??)(['"])([^'"]+)(\2)/g;
const REQUIRE_EXTENSIONS_PATTERN = /(?:^|[^.]\s*)(\b(?:require\s*?\.\s*?(?:requireActual|requireMock)|jest\s*?\.\s*?(?:requireActual|requireMock|genMockFromModule))\s*?\(\s*?)([`'"])([^`'"]+)(\2\s*?\))/g;
const REQUIRE_RE = /(?:^|[^.]\s*)(\brequire\s*?\(\s*?)([`'"])([^`'"]+)(\2\s*?\))/g;
const NODE_DEPENDENCIES = new Set([
  'child_process',
  'path',
  'fs',
  'os',
  'crypto',
  'console',
]);
const rootDir = path.resolve(__dirname, '..');

const packages = glob.sync(path.resolve(rootDir, 'packages/*/'));

const extractDependencies = src => {
  const dependencies = new Set();
  const addDependency = (match, pre, quot, dep) => {
    dependencies.add(dep);
    return match;
  };

  src
    .replace(blockCommentRe, '')
    .replace(lineCommentRe, '')
    .replace(IMPORT_RE, addDependency)
    .replace(REQUIRE_EXTENSIONS_PATTERN, addDependency)
    .replace(REQUIRE_RE, addDependency);

  return dependencies;
};

const isntLocalDep = (dep: string) => !dep.match(/\.?\.\//);
// dynamic deps with interpolation. e.g. `import(${someVar})`
const isntDynamicDep = (dep: string) => !dep.match(/^\$\{/);
const isntNodeDep = (dep: string) => !NODE_DEPENDENCIES.has(dep);

const stripPaths = dep => {
  return dep[0] === '@'
    ? dep
        .split('/')
        .slice(0, 2)
        .join('/')
    : dep.split('/')[0];
};

test('packages', () => {
  expect(packages.map(p => path.relative(rootDir, p))).toMatchSnapshot();
});

for (const pkg of packages) {
  test.skip(`dependencies of ${path.relative(
    rootDir,
    pkg,
  )} are defined in package.json`, () => {
    const srcFiles = glob.sync(path.resolve(pkg, 'src/**/*.js'));

    const deps = srcFiles
      .map(f => fs.readFileSync(f).toString())
      .map(src => extractDependencies(src))
      .reduce((all, deps) => Array.from(new Set([...all, ...deps])), [])
      .filter(isntLocalDep)
      .filter(isntDynamicDep)
      .filter(isntNodeDep)
      .map(stripPaths);

    // $FlowFixMe
    const pkgJson = require(path.resolve(pkg, 'package.json'));

    const pkgJsonDeps = new Set([
      ...Object.keys(pkgJson.dependencies || {}),
      ...Object.keys(pkgJson.peerDependencies || {}),
    ]);
    expect(new Set(deps)).toEqual(pkgJsonDeps);
  });
}

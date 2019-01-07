/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

/**
 * script to build (transpile) files.
 * By default it transpiles all files for all packages and writes them
 * into `build/` directory.
 * Non-ts or files matching IGNORE_PATTERN will be copied without transpiling.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const mkdirp = require('mkdirp');

const babel = require('@babel/core');
const chalk = require('chalk');
const micromatch = require('micromatch');
const prettier = require('prettier');
const stringLength = require('string-length');
const getPackages = require('./getPackages');
const PACKAGES_DIR = require('./getPackages').PACKAGES_DIR;

const OK = chalk.reset.inverse.bold.green(' DONE ');
const SRC_DIR = 'src';
const BUILD_DIR = 'build';
const SRC_FILES_PATTERN = '**/!(*.d).{js,ts}';
const IGNORE_PATTERN = '**/{__{tests,mocks}}';

// not being used since transform-inline-imports-commonjs does not work on line #124
// const INLINE_REQUIRE_BLACKLIST = /.*/;

const transformOptions = require('../babel.config');

transformOptions.babelrc = false;
// $FlowFixMe
const prettierConfig = prettier.resolveConfig.sync(__filename);
prettierConfig.trailingComma = 'none';
prettierConfig.parser = 'babylon';

const adjustToTerminalWidth = str => {
  // $FlowFixMe
  const columns: number = process.stdout.columns || 80;
  const WIDTH = columns - stringLength(OK) + 1;
  const strs = str.match(new RegExp(`(.{1,${WIDTH}})`, 'g'));
  // $FlowFixMe
  let lastString = strs[strs.length - 1];
  if (lastString.length < WIDTH) {
    lastString += Array(WIDTH - lastString.length).join(chalk.dim('.'));
  }
  return (
    strs
      // $FlowFixMe
      .slice(0, -1)
      .concat(lastString)
      .join('\n')
  );
};

function getPackageName(file) {
  return path.relative(PACKAGES_DIR, file).split(path.sep)[0];
}

function getBuildPath(file, buildFolder) {
  const pkgName = getPackageName(file);
  const pkgSrcPath = path.resolve(PACKAGES_DIR, pkgName, SRC_DIR);
  const pkgBuildPath = path.resolve(PACKAGES_DIR, pkgName, buildFolder);
  const relativeToSrcPath = path
    .relative(pkgSrcPath, file)
    .replace(/\.ts/, '.js');
  return path.resolve(pkgBuildPath, relativeToSrcPath);
}

function buildNodePackage(p) {
  const srcDir = path.resolve(p, SRC_DIR);
  const pattern = path.resolve(srcDir, '**/*');

  const files = glob.sync(pattern, {nodir: true});

  process.stdout.write(adjustToTerminalWidth(`${path.basename(p)}\n`));

  files.forEach(file => buildFile(file, true));
  process.stdout.write(`${OK}\n`);
}

function buildFile(file, silent) {
  const destPath = getBuildPath(file, BUILD_DIR);

  const makeDir = () => mkdirp.sync(path.dirname(destPath));
  if (micromatch.isMatch(file, IGNORE_PATTERN)) {
    silent ||
      process.stdout.write(
        chalk.dim('  \u2022 ') +
          path.relative(PACKAGES_DIR, file) +
          ' (ignore)\n',
      );
  } else if (!micromatch.isMatch(file, SRC_FILES_PATTERN)) {
    makeDir();
    fs.createReadStream(file).pipe(fs.createWriteStream(destPath));
    silent ||
      process.stdout.write(
        chalk.red('  \u2022 ') +
          path.relative(PACKAGES_DIR, file) +
          chalk.red(' \u21D2 ') +
          path.relative(PACKAGES_DIR, destPath) +
          ' (copy)' +
          '\n',
      );
  } else {
    makeDir();
    const options = Object.assign({}, transformOptions);
    options.plugins = options.plugins.slice();

    /**
     * // todo: remove comment
     * Removed this code block below since `transform-inline-imports-commonjs` does
     * not work with babel 7.
     * https://github.com/zertosh/babel-plugin-transform-inline-imports-commonjs/issues/12#issue-392307642
     *
     * `if (!INLINE_REQUIRE_BLACKLIST.test(file)) {}`
     * */

    const transformed = babel.transformFileSync(file, options).code;
    // $FlowFixMe
    const prettyCode = prettier.format(transformed, prettierConfig);
    fs.writeFileSync(destPath, prettyCode);
    silent ||
      process.stdout.write(
        chalk.green('  \u2022 ') +
          path.relative(PACKAGES_DIR, file) +
          chalk.green(' \u21D2 ') +
          path.relative(PACKAGES_DIR, destPath) +
          '\n',
      );
  }
}

const files = process.argv.slice(2);

if (files.length) {
  process.stdout.write(chalk.inverse(' Transpiled files \n'));

  // the 2nd parameter must be set to false explicitly because
  // it would default to true for subsequent files when in watch mode
  files.forEach(f => buildFile(f, false));
  process.stdout.write('\n');
} else {
  const packages = getPackages();
  process.stdout.write(chalk.inverse(' Building packages \n'));
  packages.forEach(buildNodePackage);
  process.stdout.write('\n');
}

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @noflow
 */

const fs = require('fs-extra');
const path = require('path');
const ATOM_PACKAGE_DEPENDENCIES = [
  'file-icons',
  'tool-bar',
  'highlight-selected',
  'language-babel',
  'language-graphql',
  'language-haskell',
  'language-ini',
  'language-kotlin',
  'language-lua',
  'language-ocaml',
  'language-rust',
  'language-swift',
  'language-thrift',
  'language-scala',
  'nuclide-format-js',
  'set-syntax',
  'sort-lines',
];

module.exports = ({atomHome}) => {
  fs.ensureSymlinkSync(
    '/Users/dabramov/fbsource/xplat/nuclide',
    path.join(atomHome, 'packages/nuclide'),
  );

  for (const dep of ATOM_PACKAGE_DEPENDENCIES) {
    fs.ensureSymlinkSync(
      path.join('/Users/dabramov/.atom/packages', dep),
      path.join(atomHome, 'packages', dep),
    );
  }
};

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  atomExecutable: '/Applications/Atom.app/Contents/MacOS/Atom',
  consoleFilter: consoleOutput => {
    if (!consoleOutput) {
      return consoleOutput;
    }
    return consoleOutput.filter(consoleBuffer => {
      const {origin, message} = consoleBuffer;
      return !(
        origin.match(/track-nuclide-ready/) ||
        message.match(/Starting local RPC process with/) ||
        message.match(`let notifier =`) ||
        message.match(`nvm is not compatible with the npm config "prefix"`) ||
        message.match(`nvm use --delete-prefix`)
      );
    });
  },
};

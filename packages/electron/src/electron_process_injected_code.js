/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

// $FlowFixMe flow doesn't know about console
import {Console} from 'console';
delete global.console;
global.console = new Console(process.stdout, process.stderr);
import {app, BrowserWindow} from 'electron';

import RPCConnection from '@jest-runner/rpc/RPCConnection';
import JestWorkerRPC from './rpc/JestWorkerRPC';

const isMain = process.env.isMain === 'true';

// for testing purposes, it is probably a good idea to keep everything at
// the same scale so that renders do not vary from device to device.
app.commandLine.appendSwitch('high-dpi-support', 1);
app.commandLine.appendSwitch('force-device-scale-factor', 1);

app.on('ready', async () => {
  // electron automatically quits if all windows are destroyed,
  // this mainWindow will keep electron running even if all other windows
  // are gone. There's probably a better way to do it
  // eslint-disable-next-line no-unused-vars
  const mainWindow = new BrowserWindow({show: false})

  if (isMain) {
    // we spin up an electron process for each test on the main process
    // which pops up an icon for each on macOs. Hiding them is less intrusive
    app.dock && app.dock.hide();
  }

  const rpcConnection = new RPCConnection(JestWorkerRPC);
  await rpcConnection.connect();
});

'use strict';










var _console = require('console');



var _electron = require('electron');




var _ipcClient = require('../ipc-client');
var _utils = require('../utils');







var _os = require('os');var _os2 = _interopRequireDefault(_os);
var _run_test = require('jest-runner/build/run_test');var _run_test2 = _interopRequireDefault(_run_test);
var _jestRuntime = require('jest-runtime');var _jestRuntime2 = _interopRequireDefault(_jestRuntime);
var _jestHasteMap = require('jest-haste-map');var _jestHasteMap2 = _interopRequireDefault(_jestHasteMap);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}delete global.console; /**
                                                                                                                                                                                                                              * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
                                                                                                                                                                                                                              *
                                                                                                                                                                                                                              * This source code is licensed under the MIT license found in the
                                                                                                                                                                                                                              * LICENSE file in the root directory of this source tree.
                                                                                                                                                                                                                              *
                                                                                                                                                                                                                              * 
                                                                                                                                                                                                                              * @format
                                                                                                                                                                                                                              */ // $FlowFixMe flow doesn't know about console
global.console = new _console.Console(process.stdout, process.stderr); // $FlowFixMe
const appReady = new Promise(r => _electron.app.on('ready', r));const _runTest = testData => // testData.path,
// testData.globalConfig,
// testData.config,
// testData.rawModuleMap,
// getResolver(testData.config, testData.rawModuleMap),
{return new Promise(resolve => {const win = new _electron.BrowserWindow({ show: false });win.loadURL(`file://${require.resolve('./index.html')}`);win.webContents.on('did-finish-load', () => {
      win.webContents.send('run-test', testData);
    });

    _electron.ipcMain.on('testfinished', (event, data) => {
      resolve(data);
    });
  });
};

const start = async () => {
  await appReady;
  return new Promise(async resolve => {
    const { serverID, workerID } = (0, _utils.getIPCIDs)();
    const connection = await (0, _ipcClient.connectToIPCServer)({
      serverID,
      workerID });


    connection.onMessage(message => {
      try {
        const { messageType, data } = (0, _utils.parseMessage)(message);

        switch (messageType) {
          case _utils.MESSAGE_TYPES.RUN_TEST:{
              const testData = (0, _utils.parseJSON)(data);
              _runTest(testData).
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
              // process.exit(0);
              break;
            }}

      } catch (e) {
        console.error(e);
      }
    });
  });
};

start().
then(() => {
  // process.exit(0);
}).
catch(e => {
  console.error(e);
  // process.exit(1);
});
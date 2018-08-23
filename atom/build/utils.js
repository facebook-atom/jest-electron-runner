'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.buildFailureTestResult = exports.parseMessage = exports.makeMessage = exports.parseJSON = exports.MESSAGE_TYPES = exports.getIPCIDs = exports.makeUniqWorkerId = exports.makeUniqServerId = exports.invariant = exports.rand = undefined;














var _path = require('path');var _path2 = _interopRequireDefault(_path);
var _jestMessageUtil = require('jest-message-util');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} // server id and worker id merged into one string
/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */const IPC_IDS_SEPARATOR = '_';const rand = exports.rand = () => Math.floor(Math.random() * 10000000);const invariant = exports.invariant = (condition, message) => {if (!condition) {throw new Error(message || 'Invariant violation.');}
};

const makeUniqServerId = exports.makeUniqServerId = () =>
`jest-atom-runner-ipc-server-${Date.now() + rand()}`;

const makeUniqWorkerId = exports.makeUniqWorkerId = () =>
`jest-atom-runner-ipc-worker-${Date.now() + rand()}`;

const validateIPCID = id => {
  if (typeof id === 'string' && id.match(/ipc/)) {
    return id;
  }
  throw new Error(`Invalid IPC id: "${JSON.stringify(id)}"`);
};

const getIPCIDs = exports.getIPCIDs = () => {
  const serverID = validateIPCID(process.env.JEST_SERVER_ID);
  const workerID = validateIPCID(process.env.JEST_WORKER_ID);
  return { serverID, workerID };
};

const MESSAGE_TYPES = exports.MESSAGE_TYPES = Object.freeze({
  INITIALIZE: 'INITIALIZE',
  DATA: 'DATA',
  RUN_TEST: 'RUN_TEST',
  TEST_RESULT: 'TEST_RESULT',
  TEST_FAILURE: 'TEST_FAILURE',
  SHUT_DOWN: 'SHUT_DOWN' });




const parseJSON = exports.parseJSON = str => {
  if (str == null) {
    throw new Error('String needs to be passed when parsing JSON');
  }
  let data;
  try {
    data = JSON.parse(str);
  } catch (error) {
    throw new Error(`Can't parse JSON: ${str}`);
  }

  return data;
};

const makeMessage = exports.makeMessage = ({
  messageType,
  data }) =>



`${messageType}-${data || ''}`;

const parseMessage = exports.parseMessage = message => {
  const messageType = Object.values(MESSAGE_TYPES).find(msgType =>
  message.startsWith(msgType));

  if (!messageType) {
    throw new Error(`IPC message of unknown type. Message must start from one of the following strings representing types followed by "-'.
         known types: ${JSON.stringify(MESSAGE_TYPES)}`);
  }

  return { messageType, data: message.slice(messageType.length + 1) };
};

const buildFailureTestResult = exports.buildFailureTestResult = (
testPath,
err,
config,
globalConfig) =>
{
  const failureMessage = (0, _jestMessageUtil.formatExecError)(err, config, globalConfig);
  return {
    console: null,
    displayName: '',
    failureMessage,
    leaks: false,
    numFailingTests: 0,
    numPassingTests: 0,
    numPendingTests: 0,
    perfStats: {
      end: 0,
      start: 0 },

    skipped: false,
    snapshot: {
      added: 0,
      fileDeleted: false,
      matched: 0,
      unchecked: 0,
      uncheckedKeys: [],
      unmatched: 0,
      updated: 0 },

    sourceMaps: {},
    testExecError: failureMessage,
    testFilePath: testPath,
    testResults: [] };

};exports.default =

{
  rand,
  makeUniqServerId,
  makeUniqWorkerId,
  parseMessage,
  makeMessage,
  MESSAGE_TYPES,
  parseJSON,
  buildFailureTestResult };
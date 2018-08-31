/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {TestResult, ProjectConfig, GlobalConfig} from '../types';
export type WorkerID = string;
export type ServerID = string;

import {formatExecError} from 'jest-message-util';

export const rand = () => Math.floor(Math.random() * 10000000);

export const invariant = (condition: any, message?: string) => {
  if (!condition) {
    throw new Error(message || 'Invariant violation.');
  }
};

export const makeUniqServerId = (): ServerID =>
  `jest-atom-runner-ipc-server-${Date.now() + rand()}`;

export const makeUniqWorkerId = (): WorkerID =>
  `jest-atom-runner-ipc-worker-${Date.now() + rand()}`;

export const validateIPCID = (id: ?string): string => {
  if (typeof id === 'string' && id.match(/ipc/)) {
    return id;
  }
  throw new Error(`Invalid IPC id: "${JSON.stringify(id)}"`);
};

export const getIPCIDs = (): {serverID: ServerID, workerID: WorkerID} => {
  const serverID = validateIPCID(process.env.JEST_SERVER_ID);
  const workerID = validateIPCID(process.env.JEST_WORKER_ID);
  return {serverID, workerID};
};

export const MESSAGE_TYPES = Object.freeze({
  INITIALIZE: 'INITIALIZE',
  DATA: 'DATA',
  RUN_TEST: 'RUN_TEST',
  TEST_RESULT: 'TEST_RESULT',
  TEST_FAILURE: 'TEST_FAILURE',
  SHUT_DOWN: 'SHUT_DOWN',
});

// eslint-disable-next-line
export type MessageType = $Values<typeof MESSAGE_TYPES>;

export const parseJSON = (str: ?string): Object => {
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

export const makeMessage = ({
  messageType,
  data,
}: {
  messageType: MessageType,
  data?: string,
}) => `${messageType}-${data || ''}`;

export const parseMessage = (message: string) => {
  const messageType: messageType = Object.values(MESSAGE_TYPES).find(msgType =>
    message.startsWith((msgType: any)),
  );
  if (!messageType) {
    throw new Error(`IPC message of unknown type. Message must start from one of the following strings representing types followed by "-'.
         known types: ${JSON.stringify(MESSAGE_TYPES)}`);
  }

  return {messageType, data: message.slice(messageType.length + 1)};
};

export const buildFailureTestResult = (
  testPath: string,
  err: Error,
  config: ProjectConfig,
  globalConfig: GlobalConfig,
): TestResult => {
  const failureMessage = formatExecError(err, config, globalConfig);
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
      start: 0,
    },
    skipped: false,
    snapshot: {
      added: 0,
      fileDeleted: false,
      matched: 0,
      unchecked: 0,
      uncheckedKeys: [],
      unmatched: 0,
      updated: 0,
    },
    sourceMaps: {},
    testExecError: failureMessage,
    testFilePath: testPath,
    testResults: [],
  };
};

/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import uuidv4 from 'uuid/v4';

export const makeRequest = (method: string, params: any) => {
  return {
    jsonrpc: '2.0',
    method,
    params,
    id: uuidv4(),
  };
};

export const serializeRequest = (method: string, params: any) => {
  const request = makeRequest(method, params);
  return {id: request.id, json: JSON.stringify(request)};
};

export const parseRequest = (json: string) => {
  const obj = JSON.parse(json);
  return obj;
};

export const serializeResultResponse = (result: any, id: string) => {
  const response = {
    jsonrpc: '2.0',
    result,
    id,
  };

  return JSON.stringify(response);
};

export const serializeErrorResponse = (error: any, id: string) => {
  const response = {
    jsonrpc: '2.0',
    error: makeError(error),
    id,
  };

  return JSON.stringify(response);
};

export const parseResponse = (json: string) => {
  const obj = JSON.parse(json);
  return obj;
};

const makeError = (error: any, code: number = 1) => {
  if (error instanceof Error) {
    return {
      code,
      message: error.message,
      data: error.stack,
    };
  }

  return {
    code,
    mesasge: JSON.stringify(error),
  };
};

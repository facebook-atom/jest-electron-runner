/**
 * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

export type ServerID = string;
export const rand = () => Math.floor(Math.random() * 10000000);

export const validateIPCID = (id: ?string): string => {
  if (typeof id === 'string' && id.match(/ipc/)) {
    return id;
  }
  throw new Error(`Invalid IPC id: "${JSON.stringify(id)}"`);
};

export const makeUniqServerId = (): ServerID =>
  `ipc-server-${Date.now() + rand()}`;

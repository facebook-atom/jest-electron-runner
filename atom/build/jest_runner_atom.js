'use strict';









var _jest_runner = require('./jest_runner');var _jest_runner2 = _interopRequireDefault(_jest_runner);
var _AtomTestWorker = require('./AtomTestWorker');var _AtomTestWorker2 = _interopRequireDefault(_AtomTestWorker);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                                                                                                * Copyright (c) 2014-present, Facebook, Inc. All rights reserved.
                                                                                                                                                                                                                *
                                                                                                                                                                                                                * This source code is licensed under the MIT license found in the
                                                                                                                                                                                                                * LICENSE file in the root directory of this source tree.
                                                                                                                                                                                                                *
                                                                                                                                                                                                                *  strict-local
                                                                                                                                                                                                                * @format
                                                                                                                                                                                                                */class AtomJestRunner extends _jest_runner2.default {}AtomJestRunner.TestWorker = _AtomTestWorker2.default;module.exports = AtomJestRunner;
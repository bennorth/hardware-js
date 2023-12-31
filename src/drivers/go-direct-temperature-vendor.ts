// The code in this file is taken from
//
// https://github.com/VernierST/godirect-js/blob/main/src/constants.js
//
// and is used under the following licence:
//
// BSD 3-Clause License
//
// Copyright (c) 2019, Vernier Software & Technology All rights
// reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// * Redistributions of source code must retain the above copyright
//   notice, this list of conditions and the following disclaimer.
//
// * Redistributions in binary form must reproduce the above copyright
//   notice, this list of conditions and the following disclaimer in the
//   documentation and/or other materials provided with the
//   distribution.
//
// * Neither the name of the copyright holder nor the names of its
//   contributors may be used to endorse or promote products derived
//   from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
// OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
// AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
// WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

const HEADER = new Uint8Array([0x58, 0x00, 0x00, 0x00]);

const INIT = new Uint8Array([
  0x1a, 0xa5, 0x4a, 0x06, 0x49, 0x07, 0x48, 0x08, 0x47, 0x09, 0x46, 0x0a, 0x45,
  0x0b, 0x44, 0x0c, 0x43, 0x0d, 0x42, 0x0e, 0x41,
]);

const START_MEASUREMENTS = new Uint8Array([
  0x18, 0xff, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00,
]);

const STOP_MEASUREMENTS = new Uint8Array([
  0x19, 0xff, 0x00, 0xff, 0xff, 0xff, 0xff,
]);

const SET_MEASUREMENT_PERIOD = new Uint8Array([
  0x1b, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const DISCONNECT = new Uint8Array([0x54]);
const GET_INFO = new Uint8Array([0x55]);
const GET_STATUS = new Uint8Array([0x10]);
const GET_SENSOR_IDS = new Uint8Array([0x51]);
const GET_SENSOR_INFO = new Uint8Array([0x50, 0x00]);
const GET_DEFAULT_SENSORS_MASK = new Uint8Array([0x56]);

export const commands = {
  HEADER,
  INIT,
  DISCONNECT,
  START_MEASUREMENTS,
  STOP_MEASUREMENTS,
  SET_MEASUREMENT_PERIOD,
  GET_INFO,
  GET_STATUS,
  GET_SENSOR_IDS,
  GET_SENSOR_INFO,
  GET_DEFAULT_SENSORS_MASK,
};

const NORMAL_REAL32 = 0x06;
const WIDE_REAL32 = 0x07;
const APERIODIC_REAL32 = 0x0a;
const SINGLE_CHANNEL_REAL32 = 0x08;
const SINGLE_CHANNEL_INT32 = 0x09;
const APERIODIC_INT32 = 0x0b;
const START_TIME = 0x0c;
const DROPPED = 0x0d;
const PERIOD = 0x0e;

export const measurementType = {
  NORMAL_REAL32,
  WIDE_REAL32,
  APERIODIC_REAL32,
  SINGLE_CHANNEL_REAL32,
  SINGLE_CHANNEL_INT32,
  APERIODIC_INT32,
  START_TIME,
  DROPPED,
  PERIOD,
};

const MEASUREMENT = 0x20;

export const responseType = {
  MEASUREMENT,
};

const IDLE = 0;
const CHARGING = 1;
const COMPLETE = 2;
const ERROR = 3;

export const chargingState = {
  IDLE,
  CHARGING,
  COMPLETE,
  ERROR,
};

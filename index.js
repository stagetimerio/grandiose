/* Copyright 2018 Streampunk Media Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const path = require("path")

const addon = require('bindings')({
  bindings: "grandiose",
  module_root: path.resolve(__dirname)
});

const COLOR_FORMAT_BGRX_BGRA = 0; // No alpha channel: BGRX, Alpha channel: BGRA
const COLOR_FORMAT_UYVY_BGRA = 1; // No alpha channel: UYVY, Alpha channel: BGRA
const COLOR_FORMAT_RGBX_RGBA = 2; // No alpha channel: RGBX, Alpha channel: RGBA
const COLOR_FORMAT_UYVY_RGBA = 3; // No alpha channel: UYVY, Alpha channel: RGBA

const NDI_LIB_FOURCC = (ch0, ch1, ch2, ch3) =>
	(ch0.charCodeAt(0) | (ch1.charCodeAt(0) << 8) | (ch2.charCodeAt(0) << 16) | (ch3.charCodeAt(0) << 24))

const FOURCC_UYVY = NDI_LIB_FOURCC("U", "Y", "V", "Y")
const FOURCC_UYVA = NDI_LIB_FOURCC("U", "Y", "V", "A")
const FOURCC_P216 = NDI_LIB_FOURCC("P", "2", "1", "6")
const FOURCC_PA16 = NDI_LIB_FOURCC("P", "A", "1", "6")
const FOURCC_YV12 = NDI_LIB_FOURCC("Y", "V", "1", "2")
const FOURCC_I420 = NDI_LIB_FOURCC("I", "4", "2", "0")
const FOURCC_NV12 = NDI_LIB_FOURCC("N", "V", "1", "2")
const FOURCC_BGRA = NDI_LIB_FOURCC("B", "G", "R", "A")
const FOURCC_BGRX = NDI_LIB_FOURCC("B", "G", "R", "X")
const FOURCC_RGBA = NDI_LIB_FOURCC("R", "G", "B", "A")
const FOURCC_RGBX = NDI_LIB_FOURCC("R", "G", "B", "X")
const FOURCC_FLTp = NDI_LIB_FOURCC("F", "L", "T", "p")

// On Windows there are some APIs that require bottom to top images in RGBA format. Specifying
// this format will return images in this format. The image data pointer will still point to the
// "top" of the image, althought he stride will be negative. You can get the "bottom" line of the image
// using : video_data.p_data + (video_data.yres - 1)*video_data.line_stride_in_bytes
const COLOR_FORMAT_BGRX_BGRA_FLIPPED = 200;

const COLOR_FORMAT_FASTEST = 100;

const BANDWIDTH_METADATA_ONLY = -10; // Receive metadata.
const BANDWIDTH_AUDIO_ONLY    =  10; // Receive metadata, audio.
const BANDWIDTH_LOWEST        =  0; // Receive metadata, audio, video at a lower bandwidth and resolution.
const BANDWIDTH_HIGHEST       =  100; // Receive metadata, audio, video at full resolution.

const FORMAT_TYPE_PROGRESSIVE = 1;
const FORMAT_TYPE_INTERLACED = 0;
const FORMAT_TYPE_FIELD_0 = 2;
const FORMAT_TYPE_FIELD_1 = 3;

// Default NDI audio format
// Channels stored one after the other in each block - 32-bit floating point values
const AUDIO_FORMAT_FLOAT_32_SEPARATE = 0;
// Alternative NDI audio foramt
// Channels stored as channel-interleaved 32-bit floating point values
const AUDIO_FORMAT_FLOAT_32_INTERLEAVED = 1;
// Alternative NDI audio format
// Channels stored as channel-interleaved 16-bit integer values
const AUDIO_FORMAT_INT_16_INTERLEAVED = 2;

let find = function (...args) {
  if (args.length === 0) return addon.find({});
  if (Array.isArray(args[0].groups)) {
    args[0].groups = args[0].groups.reduce((x, y) => x + ',' + y);
  }
  if (Array.isArray(args[0].extraIPs)) {
    args[0].extraIPs = args[0].extraIPs.reduce((x, y) => x + ',' + y);
  }
  return addon.find.apply(null, args);
}

module.exports = {
  version: addon.version,
  isSupportedCPU: addon.isSupportedCPU,
  initialize: addon.initialize,
  destroy: addon.destroy,
  find: find,
  receive: addon.receive,
  send: addon.send,
  routing: addon.routing,
  COLOR_FORMAT_BGRX_BGRA, COLOR_FORMAT_UYVY_BGRA,
  COLOR_FORMAT_RGBX_RGBA, COLOR_FORMAT_UYVY_RGBA,
  COLOR_FORMAT_BGRX_BGRA_FLIPPED, COLOR_FORMAT_FASTEST,
  FOURCC_UYVY, FOURCC_UYVA, FOURCC_P216, FOURCC_PA16, FOURCC_YV12,
  FOURCC_I420, FOURCC_NV12, FOURCC_BGRA, FOURCC_BGRX, FOURCC_RGBA, FOURCC_RGBX,
  FOURCC_FLTp,
  BANDWIDTH_METADATA_ONLY, BANDWIDTH_AUDIO_ONLY,
  BANDWIDTH_LOWEST, BANDWIDTH_HIGHEST,
  FORMAT_TYPE_PROGRESSIVE, FORMAT_TYPE_INTERLACED,
  FORMAT_TYPE_FIELD_0, FORMAT_TYPE_FIELD_1,
  AUDIO_FORMAT_FLOAT_32_SEPARATE, AUDIO_FORMAT_FLOAT_32_INTERLEAVED,
  AUDIO_FORMAT_INT_16_INTERLEAVED
};

# Grandiose

[Node.js](https://nodejs.org/) N-API native addon wrapping the [NDI](https://ndi.video/) SDK. Find, receive, and send NDI video, audio, and metadata streams over IP networks.

All calls are asynchronous using promises, with NDI work running on separate threads from the Node.js event loop.

Used in production by [Stagetimer](https://stagetimer.io) for NDI output in the desktop app.

## Fork Lineage

This is a maintained fork with the following history:

1. [Streampunk/grandiose](https://github.com/Streampunk/grandiose) — original implementation (find + receive)
2. [ianshade/grandiose](https://github.com/ianshade/grandiose) — added NDI sender, TypeScript types
3. [danjenkins/grandiose](https://github.com/danjenkins/grandiose) — macOS portability fixes
4. [rse/grandiose](https://github.com/rse/grandiose) — consolidated forks, upgraded to NDI SDK 6, added audio send + routing

All upstream repos are effectively abandoned. This fork fixes bugs, improves TypeScript types, and is actively maintained. See [CHANGELOG.md](CHANGELOG.md) for details.

## Installation

Supported platforms: Windows (x64), macOS (x64, arm64), Linux (x64, arm64).

```
npm install @stagetimerio/grandiose
```

Requires [Node.js](https://nodejs.org/) LTS and a C++ toolchain for native module compilation (node-gyp). The NDI SDK is downloaded automatically during `npm install`.

After install, the `dist/` folder contains everything needed at runtime:

```
node_modules/@stagetimerio/grandiose/dist/
  index.js           # JS entry point
  index.d.ts         # TypeScript types
  grandiose.node     # compiled native addon
  libndi.dylib       # NDI shared library (platform-specific)
```

When bundling your app (e.g. Electron), you only need to ship `dist/`. No other node_modules are required at runtime.

### Electron

Native addons must be rebuilt against Electron's Node headers and unpacked from the asar archive:

```bash
# Rebuild grandiose.node for Electron
electron-rebuild -f -w @stagetimerio/grandiose
```

In your Electron Forge config (or equivalent), unpack `dist/` so the native binaries are loadable at runtime:

```js
// forge.config.js
const asar = {
  unpack: '**/@stagetimerio/grandiose/dist/**',
}
```

## Usage

### Finding sources

```javascript
const grandiose = require('@stagetimerio/grandiose')

const sources = await grandiose.find()
console.log(sources)
// [
//   { name: 'MY-PC (OBS)', urlAddress: '192.168.1.10:5961' },
//   { name: 'MY-PC (Test Pattern)', urlAddress: '192.168.1.10:5962' }
// ]
```

Options:

```javascript
const sources = await grandiose.find({
  showLocalSources: true,            // include sources on this machine
  groups: 'studio3',                 // filter by group name (string or array)
  extraIPs: ['192.168.1.122']        // check specific IPs not visible via mDNS
})
```

### Receiving streams

```javascript
const source = { name: '<source_name>', urlAddress: '<ip>:<port>' }
const receiver = await grandiose.receive({ source })

// Receive 10 video frames
for (let i = 0; i < 10; i++) {
  const videoFrame = await receiver.video(5000) // optional timeout in ms
  console.log(videoFrame.xres, videoFrame.yres, videoFrame.data.length)
}
```

Receiver options:

```javascript
const receiver = await grandiose.receive({
  source,
  colorFormat: grandiose.COLOR_FORMAT_BGRX_BGRA,  // default: COLOR_FORMAT_FASTEST
  bandwidth: grandiose.BANDWIDTH_HIGHEST,          // default: BANDWIDTH_HIGHEST
  allowVideoFields: true,                          // default: true
  name: 'my-receiver'                              // optional
})
```

#### Video frame

```javascript
const frame = await receiver.video()
// {
//   type: 'video',
//   xres: 1920, yres: 1080,
//   frameRateN: 30000, frameRateD: 1001,
//   fourCC: ...,
//   pictureAspectRatio: 1.778,
//   timestamp: [sec, nsec],       // PTP timestamp
//   timecode: [sec, nsec],
//   lineStrideBytes: 3840,
//   data: <Buffer ...>
// }
```

#### Audio frame

```javascript
const frame = await receiver.audio({
  audioFormat: grandiose.AUDIO_FORMAT_FLOAT_32_SEPARATE,  // default
  referenceLevel: 0                                       // dB above +4dBU
}, 5000)
// {
//   type: 'audio',
//   sampleRate: 48000, channels: 2, samples: 4800,
//   channelStrideInBytes: 9600,
//   timestamp: [sec, nsec],
//   data: <Buffer ...>
// }
```

#### Metadata

```javascript
const frame = await receiver.metadata()
// { data: '<ndi_product ...>' }  // XML string
```

#### Next available data

Receive whichever frame type arrives next:

```javascript
const frame = await receiver.data()
if (frame.type === 'video') { /* ... */ }
else if (frame.type === 'audio') { /* ... */ }
else if (frame.type === 'metadata') { /* ... */ }
```

### Sending streams

```javascript
const sender = await grandiose.send({
  name: 'My App',         // NDI source name (hostname is prepended automatically)
  clockVideo: true,        // let NDI handle frame timing
  clockAudio: false
})

// Send a video frame
await sender.video({
  xres: 1920,
  yres: 1080,
  frameRateN: 30000,
  frameRateD: 1001,
  fourCC: grandiose.FOURCC_BGRA,
  data: bgraBuffer
})

// Check connected receivers
const count = sender.connections()  // sync, returns number

// Get tally state (program/preview)
const tally = sender.tally()
// { onProgram: true, onPreview: false }

// Get the full NDI source name (including hostname)
const name = sender.sourcename()
// 'MY-PC (My App)'

// Clean up
await sender.destroy()
```

### Routing

```javascript
const router = await grandiose.routing({ name: 'My Router' })
const sources = await grandiose.find()
router.change(sources[0])   // route a source
router.connections()         // number of receivers
router.sourcename()          // full NDI name
router.clear()               // stop routing
await router.destroy()
```

### Utilities

```javascript
grandiose.version()        // NDI SDK version string
grandiose.isSupportedCPU() // true if CPU supports NDI
```

## License

Apache 2.0. Copyright 2018 Streampunk Media Ltd, with subsequent modifications by contributors.

The NDI SDK libraries are provided under a royalty-free license from NDI (formerly NewTek, Inc.). Header files are MIT-licensed. Runtime libraries are covered by the NDI SDK license.

NDI is a trademark of Vizrt Group.

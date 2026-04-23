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

`grandiose.find()` returns a **finder object**, not a source list directly. NDI discovery runs asynchronously over mDNS, so you `await wait()` until sources appear (or a timeout), then call `sources()` to read the current list.

```javascript
const grandiose = require('@stagetimerio/grandiose')

const finder = await grandiose.find()
await finder.wait(5000)  // up to 5s waiting for discovery — runs off the event loop

const sources = finder.sources()
console.log(sources)
// [
//   { name: 'MY-PC (OBS)', urlAddress: '192.168.1.10:5961' },
//   { name: 'MY-PC (Test Pattern)', urlAddress: '192.168.1.10:5962' }
// ]

await finder.destroy()  // always clean up
```

Options:

```javascript
const finder = await grandiose.find({
  showLocalSources: true,            // include sources on this machine
  groups: 'studio3',                 // filter by group name (string or array)
  extraIPs: ['192.168.1.122']        // check specific IPs not visible via mDNS
})
```

For a long-running app, keep the finder alive and loop — sources come and go as devices join or leave the network:

```javascript
const finder = await grandiose.find({ showLocalSources: true })
while (true) {
  await finder.wait(1000)
  console.log(finder.sources())
}
```

Finder methods:

- `finder.sources()` — synchronous; returns the current `Source[]` (may be empty if discovery hasn't found anything yet).
- `finder.wait(timeout = 10000)` — returns `Promise<boolean>`; resolves `true` if the source list changed, `false` on timeout. Waits off the event loop.
- `finder.destroy()` — releases the native finder; always `await` this when you're done.

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
//   frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE,
//   timestamp: [sec, nsec],        // PTP timestamp
//   timecode: [sec, nsec],
//   lineStrideBytes: 3840,
//   metadata: '<ndi_...>',          // optional, present when sender attaches it
//   data: <Buffer ...>
// }
```

#### Audio frame

```javascript
const frame = await receiver.audio({
  audioFormat: grandiose.AUDIO_FORMAT_FLOAT_32_SEPARATE,  // default
  referenceLevel: 20                                      // dB above +4dBU (int16 only)
}, 5000)
// {
//   type: 'audio',
//   audioFormat: grandiose.AUDIO_FORMAT_FLOAT_32_SEPARATE,
//   sampleRate: 48000, channels: 2, samples: 4800,
//   channelStrideInBytes: 9600,
//   timestamp: [sec, nsec],
//   timecode: [sec, nsec],
//   referenceLevel: 20,             // only present when audioFormat is INT_16_INTERLEAVED
//   metadata: '<ndi_...>',          // optional, present when sender attaches it
//   data: <Buffer ...>
// }
```

`referenceLevel` only affects `AUDIO_FORMAT_INT_16_INTERLEAVED` (controls the float-to-int gain). It's ignored for the float formats.

#### Metadata

```javascript
const frame = await receiver.metadata()
// {
//   type: 'metadata',
//   length: 42,
//   timecode: [sec, nsec],
//   data: '<ndi_product ...>'       // XML string
// }
```

#### Next available data

`receiver.data()` resolves with whichever frame type arrives next — video, audio, metadata, or a connection event:

```javascript
const frame = await receiver.data()
switch (frame.type) {
  case 'video':        /* VideoFrame — see above */ break
  case 'audio':        /* AudioFrame — see above */ break
  case 'metadata':     /* MetadataFrame — see above */ break
  case 'statusChange': /* remote source's status changed */ break
  case 'sourceChange': /* remote source itself changed */ break
}
```

The returned promise rejects with a `"Connection lost"` error when the remote source disappears.

### Sending streams

```javascript
const sender = await grandiose.send({
  name: 'My App',          // NDI source name (hostname is prepended automatically)
  clockVideo: true,        // let NDI handle video frame timing (default: false)
  clockAudio: false        // let NDI handle audio frame timing (default: false)
})

// Send a video frame — all fields below are required except timecode
await sender.video({
  xres: 1920,
  yres: 1080,
  frameRateN: 30000,
  frameRateD: 1001,
  fourCC: grandiose.FOURCC_BGRA,
  pictureAspectRatio: 16 / 9,
  frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE,
  lineStrideBytes: 1920 * 4,   // BGRA = 4 bytes per pixel
  data: bgraBuffer,
  // timecode: BigInt(...)     // optional; omitted = NDI synthesizes one
})

// Send an audio frame (32-bit float, channel-separate — the NDI native format)
// Note: send-side field names differ from receive (noChannels/noSamples/channelStrideBytes)
await sender.audio({
  sampleRate: 48000,
  noChannels: 2,
  noSamples: 1024,
  channelStrideBytes: 1024 * 4,   // 4 bytes per float sample
  fourCC: grandiose.FOURCC_FLTp,
  data: floatBuffer,
  // timecode: BigInt(...)         // optional
})

// Check connected receivers
const count = sender.connections()  // sync, returns number

// Get tally state (program/preview)
const tally = sender.tally()
// { changed: true, on_program: true, on_preview: false }

// Get the full NDI source name (including hostname)
const name = sender.sourcename()
// 'MY-PC (My App)'

// Clean up
await sender.destroy()
```

Note: the `groups` option is not currently implemented on the sender — passing it has no effect. File an issue if you need it.

### Routing

```javascript
const router = await grandiose.routing({ name: 'My Router' })

const finder = await grandiose.find()
await finder.wait(5000)
const sources = finder.sources()
await finder.destroy()

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

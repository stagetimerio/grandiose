# AGENTS.md

Node.js N-API native addon wrapping the NDI SDK. Used by [Stagetimer](https://stagetimer.io) for NDI output in the Electron desktop app.

## What This Is

A bridge between Node.js and the NDI SDK C library. The C++ layer (`src/`) exposes find, receive, send, and routing via N-API. The JS layer (`index.js`) re-exports with convenience constants. `ndi.js` downloads and assembles the NDI SDK at install time. `binding.gyp` handles native compilation and copies platform-specific libs to `build/Release/`.

## File Map

| File | What it does |
|------|-------------|
| `index.js` | Public API — re-exports native addon + constants |
| `index.d.ts` | TypeScript type definitions |
| `ndi.js` | Install script — downloads NDI SDK per platform |
| `binding.gyp` | node-gyp build config — compiles C++, copies libs |
| `src/*.cc/h` | C++ N-API bindings (find, send, receive, routing, util) |
| `scratch/` | Manual test scripts (not automated tests) |

## Build Pipeline

```
npm install
  → ndi.js        downloads NDI SDK, assembles ndi/include/ + ndi/lib/{platform}/
  → node-gyp      compiles src/*.cc against ndi/include/, copies libs to build/Release/
  → cleanup        deletes ndi/ (only needed at compile time)
```

Runtime: `index.js` loads `build/Release/grandiose.node` which links to the platform lib (`libndi.dylib`, `libndi.so`, or `Processing.NDI.Lib.*.dll`) in the same directory via rpath.

## Commands

```bash
npm install          # download SDK + compile
npm run build        # recompile without re-downloading SDK
npm run clean        # delete ndi/ and build/
npm test             # basic smoke test (prints NDI version)
```

There are no automated tests. The `scratch/` scripts are manual.

## Rules

**Don't touch C++ unless explicitly asked.** The `src/` directory is ~1500 lines of N-API bindings. Changes there require understanding N-API lifecycle, thread safety, and the NDI SDK C API. JS, TypeScript types, build config, and install scripts are fair game.

**Platform awareness.** Every change to `ndi.js` or `binding.gyp` affects 6 platform targets (win-x64, mac-x64, mac-a64, lnx-x86, lnx-x64, lnx-a64). Don't add platform-specific logic without covering all variants.

**Keep install-time dependencies minimal.** `ndi.js` runs during `npm install`. Its dependencies (`got`, `shelljs`, `tmp`, `execa`, `cross-zip`) are install-time only. Don't add runtime dependencies for install-time tasks or vice versa.

**TypeScript types must match runtime behavior.** The types in `index.d.ts` are hand-written, not generated. When the C++ layer exposes something, the types must reflect it. Check `index.js` exports and `src/grandiose_send.cc` (or relevant file) when updating types.

## Code Style

Follow the existing style in this repo — it predates our ownership:

- Double quotes for strings (not single quotes — differs from Stagetimer)
- No semicolons
- `const`/`let`, no `var`
- CommonJS (`require`/`module.exports`), not ESM

For new code, match whatever file you're editing. Don't reformat existing code.

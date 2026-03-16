# AGENTS.md

Node.js N-API native addon wrapping the NDI SDK. Used by [Stagetimer](https://stagetimer.io) for NDI output in the Electron desktop app.

## What This Is

A bridge between Node.js and the NDI SDK C library. The C++ layer (`src/`) exposes find, receive, send, and routing via N-API. The JS layer (`index.js`) re-exports with convenience constants. `scripts/ndi.js` downloads and assembles the NDI SDK at install time. `binding.gyp` handles native compilation and copies platform-specific libs to `build/Release/`. `scripts/dist.js` assembles the final runtime output in `dist/`.

## File Map

| File | What it does |
|------|-------------|
| `dist/` | **Runtime output** — self-contained, ship only this |
| `index.js` | Source JS wrapper — copied to dist/ with rewritten require |
| `index.d.ts` | TypeScript type definitions — copied to dist/ as-is |
| `scripts/dist.js` | Assembles dist/ from build artifacts |
| `scripts/ndi.js` | Install script — downloads NDI SDK per platform, dereferences symlinks |
| `binding.gyp` | node-gyp build config — compiles C++, copies libs |
| `src/*.cc/h` | C++ N-API bindings (find, send, receive, routing, util) |
| `scratch/` | Manual test scripts (not automated tests) |

## Build Pipeline

```
npm install
  → scripts/ndi.js  downloads NDI SDK, assembles ndi/include/ + ndi/lib/{platform}/
  → node-gyp        compiles src/*.cc against ndi/include/, copies libs to build/Release/
  → scripts/dist.js copies grandiose.node + NDI lib + index.js + index.d.ts into dist/
```

Runtime: `dist/index.js` loads `dist/grandiose.node` which links to the platform NDI lib (`libndi.dylib`, `libndi.so`, or `Processing.NDI.Lib.*.dll`) in the same directory via rpath.

## Commands

```bash
npm install          # download SDK + compile + build dist/
npm run build        # recompile C++ + rebuild dist/ (without re-downloading SDK)
npm run dist         # rebuild dist/ only (from existing build artifacts)
npm run clean        # delete ndi/, build/, and dist/
npm test             # smoke tests (verifies dist/ contents load correctly)
```

## Publishing

Published to **npmjs.com** (not GitHub Packages). The `.npmrc` in this repo
overrides the global `~/.npmrc` GitHub Packages redirect for `@stagetimerio`.

```bash
npm publish --access public    # first publish needed --access public
```

The `"files"` field in `package.json` controls what goes in the tarball (~26kB).
`dist/` is excluded — consumers build from source via the install script.

## Rules

**Don't touch C++ unless explicitly asked.** The `src/` directory is ~1500 lines of N-API bindings. Changes there require understanding N-API lifecycle, thread safety, and the NDI SDK C API. JS, TypeScript types, build config, and install scripts are fair game.

**Platform awareness.** Every change to `scripts/ndi.js` or `binding.gyp` affects 6 platform targets (win-x64, mac-x64, mac-a64, lnx-x86, lnx-x64, lnx-a64). Don't add platform-specific logic without covering all variants.

**Keep install-time dependencies minimal.** `scripts/ndi.js` runs during `npm install`. Its dependencies (`got`, `shelljs`, `tmp`, `execa`, `cross-zip`) are install-time only — they exist in `dependencies` so they're available when consumers install, but they never end up in `dist/`. Don't add dependencies for runtime use; `dist/` has zero npm dependencies.

**TypeScript types must match runtime behavior.** The types in `index.d.ts` are hand-written, not generated. When the C++ layer exposes something, the types must reflect it. Check `index.js` exports and `src/grandiose_send.cc` (or relevant file) when updating types.

**After changing index.js or index.d.ts, run `npm run dist`.** The dist script copies and transforms these files. Tests run against `dist/`, not the root files.

## Code Style

Follow the existing style in this repo — it predates our ownership:

- Double quotes for strings (not single quotes — differs from Stagetimer)
- No semicolons
- `const`/`let`, no `var`
- CommonJS (`require`/`module.exports`), not ESM

For new code, match whatever file you're editing. Don't reformat existing code.

# Changelog

## 0.1.1

### Fixed
- macOS: `ndi.js` moved dylibs to `mac-a64` first, leaving `mac-x64` empty — x64 builds failed with missing `libndi.dylib`

## 0.1.0

First release under `@stagetimerio/grandiose`. Based on [rse/grandiose](https://github.com/rse/grandiose) v0.0.4.

### Added
- Self-contained `dist/` folder — all runtime files in one place, zero npm dependencies at runtime
- `scripts/dist.js` — assembles dist/ from build artifacts automatically on install
- CI testing on all three platforms (Linux, macOS, Windows)
- Electron usage docs (electron-rebuild + asar unpack)

### Fixed
- Linux ARM64: add missing `ndi/lib/lnx-a64` directory creation before `shell.mv()`
- Linux ARM64: fix `library_dirs` in `binding.gyp` pointing to `lnx-x64` instead of `lnx-a64`
- Linux: NDI SDK symlinks are now dereferenced during install, fixing downstream copy issues
- TypeScript: add `connections()`, `tally()`, `sourcename()` to `Sender` type
- TypeScript: fix `send()` return type to `Promise<Sender>`

### Changed
- Package entry point moved from `index.js` to `dist/index.js`
- `ndi.js` moved to `scripts/ndi.js`
- `bindings` dependency moved to devDependencies (dist/ uses a direct require)
- Rename package to `@stagetimerio/grandiose`
- Publish to GitHub Packages
- Rewrite README with send API docs, updated platform list, fork lineage

### For consumers
- `require('@stagetimerio/grandiose')` works as before — no API changes
- When bundling (e.g. Electron), ship `dist/` only: `unpack: '**/@stagetimerio/grandiose/dist/**'`
- `electron-rebuild -f -w @stagetimerio/grandiose` to rebuild for Electron

## 0.0.4 — rse/grandiose

Last upstream release. See [rse/grandiose](https://github.com/rse/grandiose) for prior history.

- Upgrade to NDI SDK 6
- Add audio frame sending support
- Add NDI routing functionality
- Reimplement `find()` to keep finder in memory
- Various portability fixes for Windows, macOS, Linux

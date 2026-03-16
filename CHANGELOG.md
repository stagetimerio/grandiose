# Changelog

## 0.1.0 — stagetimerio fork

First release under `@stagetimerio/grandiose`. Based on [rse/grandiose](https://github.com/rse/grandiose) v0.0.4.

### Fixes
- Linux ARM64: add missing `ndi/lib/lnx-a64` directory creation before `shell.mv()`
- Linux ARM64: fix `library_dirs` in `binding.gyp` pointing to `lnx-x64` instead of `lnx-a64`
- TypeScript: add `connections()`, `tally()`, `sourcename()` to `Sender` type
- TypeScript: fix `send()` return type to `Promise<Sender>`

### Changes
- Post-build cleanup: delete `ndi/` directory after `node-gyp rebuild` (~28MB dead weight removed)
- Rename package to `@stagetimerio/grandiose`
- Publish to GitHub Packages
- Rewrite README with send API docs, updated platform list, fork lineage

## 0.0.4 — rse/grandiose

Last upstream release. See [rse/grandiose](https://github.com/rse/grandiose) for prior history.

- Upgrade to NDI SDK 6
- Add audio frame sending support
- Add NDI routing functionality
- Reimplement `find()` to keep finder in memory
- Various portability fixes for Windows, macOS, Linux

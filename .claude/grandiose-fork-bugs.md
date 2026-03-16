# Grandiose Fork: Bugs & Changes

Tracking bugs found in rse/grandiose that need fixing in the stagetimerio fork.

## Bug 1: Linux ARM64 mkdir missing in ndi.js

**File:** `ndi.js:141-146`
**Severity:** Build failure on Linux ARM64

Lines 141-142 create `ndi/lib/lnx-x86` and `ndi/lib/lnx-x64` but line 146 does `shell.mv(..., "ndi/lib/lnx-a64/")` without ever creating that directory. The `shell.mv()` will fail because the target directory doesn't exist.

**Fix:** Add `shell.mkdir("-p", "ndi/lib/lnx-a64")` after line 142 (before the `shell.mv` calls).

## Bug 2: binding.gyp ARM64 library_dirs points to wrong directory

**File:** `binding.gyp`, Linux ARM64 condition
**Severity:** Link failure on Linux ARM64

The `copies` section correctly references `lnx-a64`, but `library_dirs` incorrectly points to `lnx-x64`:
```json
"library_dirs": [ "<(ndi_dir)/lib/lnx-x64" ]  // should be lnx-a64
```
This means node-gyp would try to link against the x64 library on an ARM64 build.

**Fix:** Change `lnx-x64` → `lnx-a64` in the ARM64 `library_dirs`.

## Bug 3: TypeScript Sender type missing methods

**File:** `index.d.ts`, `Sender` interface
**Severity:** Type errors when using sender API

`Sender` is missing three methods that exist at runtime (validated in prototype):
- `connections(): number` — returns receiver count (sync)
- `tally(): { onProgram: boolean, onPreview: boolean }` — returns tally state
- `sourcename(): string` — returns full NDI name including hostname prefix

The `Routing` interface already has `connections()` and `sourcename()`, so the pattern exists — just wasn't copied to `Sender`.

Additionally, `send()` return type is `Sender` but should be `Promise<Sender>` (confirmed async in prototype testing).

## Change 1: Post-build cleanup of ndi/ directory

**File:** `ndi.js` or `package.json` install script
**Severity:** Dead weight (~28MB per platform)

After `node-gyp rebuild`, the `ndi/` directory (raw SDK) is no longer needed. `binding.gyp` copies the platform-specific lib to `build/Release/` which is the runtime location. The `ndi/` directory is dead weight.

Currently worked around in Stagetimer's `forge.config.js` with a targeted asar unpack pattern, but better to clean it up at source.

**Fix:** Add cleanup step after `node-gyp rebuild` in the install script. `shx` is already a devDep: `"install": "node ndi.js && node-gyp rebuild && shx rm -rf ndi"`

## Change 2: Package metadata

**File:** `package.json`

- name: `grandiose` → `@stagetimerio/grandiose`
- repository: update to `stagetimerio/grandiose`
- Add `publishConfig` for GitHub Packages
- Version bump TBD

## Status

- [ ] Bug 1: Linux ARM64 mkdir
- [ ] Bug 2: binding.gyp ARM64 library_dirs
- [ ] Bug 3: TypeScript Sender type
- [ ] Change 1: Post-build ndi/ cleanup
- [ ] Change 2: Package metadata
- [ ] Publish to GitHub Packages

const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..")
const buildDir = path.join(root, "build", "Release")
const distDir = path.join(root, "dist")

/* clean and create dist/ */
fs.rmSync(distDir, { recursive: true, force: true })
fs.mkdirSync(distDir)

/* copy grandiose.node */
const nodePath = path.join(buildDir, "grandiose.node")
if (!fs.existsSync(nodePath))
    throw new Error("build/Release/grandiose.node not found — run node-gyp rebuild first")
fs.copyFileSync(nodePath, path.join(distDir, "grandiose.node"))
console.log("  copied grandiose.node")

/* copy NDI shared libraries
   On macOS: real files in build/Release/
   On Linux: build/Release/ has symlinks from binding.gyp copies, so we
   also check the ndi/ source directory for the real files.
   Strategy: collect all lib filenames from build/Release/, then find the
   actual file content (resolving through ndi/ if needed). */
const libPattern = /\.(dylib|so(\.\d+(\.\d+)*)?|dll)$/
const libs = fs.readdirSync(buildDir).filter(f => libPattern.test(f))
if (libs.length === 0)
    throw new Error("No NDI shared library found in build/Release/")

/* find one real (non-symlink) source file to copy from */
let srcFile = null
for (const lib of libs) {
    const p = path.join(buildDir, lib)
    try {
        const stat = fs.lstatSync(p)
        if (stat.isFile() && !stat.isSymbolicLink()) { srcFile = p; break }
    } catch (e) { /* skip */ }
}
/* if all are symlinks, look in ndi/ source directory */
if (!srcFile) {
    const ndiDirs = { linux: { x64: "lnx-x64", arm64: "lnx-a64", ia32: "lnx-x86" },
                      darwin: { x64: "mac-x64", arm64: "mac-a64" },
                      win32: { x64: "win-x64", ia32: "win-x86" } }
    const subdir = (ndiDirs[process.platform] || {})[process.arch]
    if (subdir) {
        const ndiLibDir = path.join(root, "ndi", "lib", subdir)
        if (fs.existsSync(ndiLibDir)) {
            for (const f of fs.readdirSync(ndiLibDir)) {
                const p = path.join(ndiLibDir, f)
                const stat = fs.lstatSync(p)
                if (stat.isFile() && !stat.isSymbolicLink() && libPattern.test(f)) {
                    srcFile = p; break
                }
            }
        }
    }
}
if (!srcFile)
    throw new Error("Could not find real NDI shared library file")

/* copy the real file under each expected name */
for (const lib of libs) {
    fs.copyFileSync(srcFile, path.join(distDir, lib))
    console.log(`  copied ${lib}`)
}

/* generate dist/index.js from root index.js with rewritten require */
let indexSrc = fs.readFileSync(path.join(root, "index.js"), "utf8")
const needle = /const addon = require\('bindings'\)\(\{[\s\S]*?\}\);?/
if (!needle.test(indexSrc))
    throw new Error("Could not find bindings require in index.js — has the format changed?")
indexSrc = indexSrc.replace(
    needle,
    'const addon = require(path.join(__dirname, "grandiose.node"));'
)
fs.writeFileSync(path.join(distDir, "index.js"), indexSrc)
console.log("  generated index.js")

/* copy index.d.ts */
fs.copyFileSync(path.join(root, "index.d.ts"), path.join(distDir, "index.d.ts"))
console.log("  copied index.d.ts")

console.log("dist/ ready")

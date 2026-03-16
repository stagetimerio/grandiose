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

/* copy NDI shared libraries (glob for .dylib, .so, .so.*, .dll) */
const libPattern = /\.(dylib|so(\.\d+)?|dll)$/
const libs = fs.readdirSync(buildDir).filter(f => libPattern.test(f))
if (libs.length === 0)
    throw new Error("No NDI shared library found in build/Release/")
for (const lib of libs) {
    fs.copyFileSync(path.join(buildDir, lib), path.join(distDir, lib))
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

import { createRequire } from "module"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { test, expect } from "vitest"

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const buildDir = path.join(__dirname, "..", "build", "Release")

test("grandiose.node exists", () => {
    expect(fs.existsSync(path.join(buildDir, "grandiose.node"))).toBe(true)
})

test("platform NDI library exists in build/Release", () => {
    const files = fs.readdirSync(buildDir)
    const hasNdiLib = files.some((f) =>
        f.startsWith("libndi") || f.startsWith("Processing.NDI")
    )
    expect(hasNdiLib).toBe(true)
})

test("native addon loads and returns SDK version", () => {
    const grandiose = require("..")
    const version = grandiose.version()
    expect(version).toMatch(/NDI SDK/)
})

test("isSupportedCPU returns boolean", () => {
    const grandiose = require("..")
    expect(typeof grandiose.isSupportedCPU()).toBe("boolean")
})

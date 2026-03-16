import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { test, expect } from "vitest"

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

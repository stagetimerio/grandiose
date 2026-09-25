import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { test, expect } from "vitest"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, "..", "dist")

test("dist/ contains grandiose.node", () => {
    expect(fs.existsSync(path.join(distDir, "grandiose.node"))).toBe(true)
})

test("dist/ contains NDI shared library", () => {
    const files = fs.readdirSync(distDir)
    const hasNdiLib = files.some((f) =>
        f.startsWith("libndi") || f.startsWith("Processing.NDI")
    )
    expect(hasNdiLib).toBe(true)
})

test("dist/index.js loads and exposes API", async () => {
    const grandiose = await import(path.join(distDir, "index.js"))
    expect(typeof grandiose.version).toBe("function")
    expect(typeof grandiose.find).toBe("function")
    expect(typeof grandiose.receive).toBe("function")
    expect(typeof grandiose.send).toBe("function")
    expect(typeof grandiose.routing).toBe("function")
    expect(typeof grandiose.isSupportedCPU).toBe("function")
})

test("NDI SDK version is returned", async () => {
    const grandiose = await import(path.join(distDir, "index.js"))
    const version = grandiose.version()
    expect(typeof version).toBe("string")
    expect(version.length).toBeGreaterThan(0)
})

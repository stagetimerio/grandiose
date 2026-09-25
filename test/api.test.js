import path from "path"
import { execFileSync } from "child_process"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { describe, test, expect } from "vitest"

const distIndex = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js")
const grandiose = createRequire(import.meta.url)(distIndex)

const uniqueName = (label) => `grandiose-test-${label}-${process.pid}`
const W = 64
const H = 36
const videoFrame = (overrides = {}) => ({
    xres: W,
    yres: H,
    frameRateN: 30000,
    frameRateD: 1000,
    fourCC: grandiose.FOURCC_BGRA,
    pictureAspectRatio: W / H,
    frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE,
    lineStrideBytes: W * 4,
    data: Buffer.alloc(W * H * 4),
    ...overrides
})
const audioFrame = () => ({
    sampleRate: 48000,
    noChannels: 2,
    noSamples: 480,
    channelStrideBytes: 480 * 4,
    fourCC: grandiose.FOURCC_FLTp,
    data: Buffer.alloc(480 * 2 * 4)
})
const INVALID_ARGS = { code: "4001" }

describe("invalid arguments reject with code 4001", () => {
    test.each([
        ["send()", () => grandiose.send()],
        ["send({})", () => grandiose.send({})],
        ["send({ name: 1 })", () => grandiose.send({ name: 1 })],
        ["send() with non-boolean clockVideo", () => grandiose.send({ name: "x", clockVideo: "yes" })],
        ["find([])", () => grandiose.find([])],
        ["find() with non-boolean showLocalSources", () => grandiose.find({ showLocalSources: "yes" })],
        ["routing({ name: 1 })", () => grandiose.routing({ name: 1 })],
        ["receive({})", () => grandiose.receive({})]
    ])("%s", async (_, call) => {
        await expect(call()).rejects.toMatchObject(INVALID_ARGS)
    })
})

describe("sender", () => {
    test("exposes its API and state", async () => {
        const name = uniqueName("api")
        const sender = await grandiose.send({ name, clockVideo: false })
        try {
            expect(sender.name).toBe(name)
            expect(sender.clockVideo).toBe(false)
            expect(sender.clockAudio).toBe(false)
            expect(sender.sourcename()).toContain(`(${name})`)
            expect(sender.connections()).toBe(0)
            expect(sender.tally()).toMatchObject({ on_program: false, on_preview: false })
        } finally {
            await sender.destroy()
        }
    })

    test("sends video and audio frames", async () => {
        const sender = await grandiose.send({ name: uniqueName("frames") })
        try {
            await expect(sender.video(videoFrame())).resolves.toEqual({})
            await expect(sender.video(videoFrame({ timecode: 1234567 }))).resolves.toEqual({})
            await expect(sender.video(videoFrame({ timecode: 12345678901234n }))).resolves.toEqual({})
            await expect(sender.audio(audioFrame())).resolves.toEqual({})
        } finally {
            await sender.destroy()
        }
    })

    test("rejects invalid video frames with code 4001", async () => {
        const sender = await grandiose.send({ name: uniqueName("badframes") })
        try {
            await expect(sender.video()).rejects.toMatchObject(INVALID_ARGS)
            await expect(sender.video(videoFrame({ data: Buffer.alloc(100) }))).rejects.toMatchObject(INVALID_ARGS)
            await expect(sender.video(videoFrame({ data: new Uint8Array(W * H * 4).buffer }))).rejects.toMatchObject(INVALID_ARGS)
            await expect(sender.video(videoFrame({ fourCC: undefined }))).rejects.toMatchObject(INVALID_ARGS)
            await expect(sender.video(videoFrame({ timecode: "now" }))).rejects.toMatchObject(INVALID_ARGS)
            await expect(sender.video(videoFrame())).resolves.toEqual({})
        } finally {
            await sender.destroy()
        }
    })

    test("rejects a duplicate name with code 4102", async () => {
        const name = uniqueName("duplicate")
        const sender = await grandiose.send({ name })
        try {
            await expect(grandiose.send({ name })).rejects.toMatchObject({ code: "4102" })
        } finally {
            await sender.destroy()
        }
    })

    test("destroy() is idempotent and later calls fail", async () => {
        const sender = await grandiose.send({ name: uniqueName("destroy") })
        await expect(sender.destroy()).resolves.toBeUndefined()
        await expect(sender.destroy()).resolves.toBeUndefined()
        await expect(sender.video(videoFrame())).rejects.toThrow()
        await expect(sender.audio(audioFrame())).rejects.toThrow()
        expect(() => sender.connections()).toThrow()
        expect(() => sender.sourcename()).toThrow()
    })

    test("destroy() frees the name for a new sender", async () => {
        const name = uniqueName("reuse")
        await (await grandiose.send({ name })).destroy()
        const again = await grandiose.send({ name })
        await again.destroy()
    })

    // Needs --expose-gc, so it runs in a child process.
    test("garbage collection destroys a sender that was not destroyed", () => {
        const script = `
            const g = require(${JSON.stringify(distIndex)})
            ;(async () => {
                const name = ${JSON.stringify(uniqueName("gc"))}
                await g.send({ name })
                for (let i = 0; i < 5; i++) { global.gc(); await new Promise(r => setTimeout(r, 50)) }
                const again = await g.send({ name })
                await again.destroy()
                console.log("reused")
            })().catch((err) => { console.log(err.code); process.exitCode = 1 })
        `
        const out = execFileSync(process.execPath, ["--expose-gc", "-e", script], { encoding: "utf8" })
        expect(out.trim()).toBe("reused")
    })
})

describe("finder", () => {
    test("find() without arguments waits and lists sources", async () => {
        const finder = await grandiose.find()
        try {
            expect(typeof await finder.wait(10)).toBe("boolean")
            expect(Array.isArray(finder.sources())).toBe(true)
        } finally {
            await finder.destroy()
        }
    })

    test("accepts groups and extraIPs as arrays", async () => {
        const finder = await grandiose.find({ showLocalSources: true, groups: ["a", "b"], extraIPs: ["127.0.0.1"] })
        await finder.destroy()
    })
})

describe("routing", () => {
    test("routes to a source, clears and destroys", async () => {
        const name = uniqueName("routing")
        const routing = await grandiose.routing({ name })
        try {
            expect(routing.sourcename()).toContain(`(${name})`)
            expect(routing.change({ name: "HOST (nothing)" })).toBe(true)
            expect(typeof routing.connections()).toBe("number")
            expect(routing.clear()).toBe(true)
            expect(() => routing.change()).toThrow()
        } finally {
            await routing.destroy()
        }
    })
})

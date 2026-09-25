import path from "path"
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { test, expect } from "vitest"

const distIndex = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js")
const grandiose = createRequire(import.meta.url)(distIndex)

const W = 320
const H = 180
// BGR. NDI compresses video, so frames are compared by average colour.
const COLOURS = { red: [0, 0, 255], green: [0, 255, 0], blue: [255, 0, 0] }

function solidFrame ([b, g, r]) {
    const data = Buffer.alloc(W * H * 4)
    for (let i = 0; i < data.length; i += 4) {
        data[i] = b
        data[i + 1] = g
        data[i + 2] = r
        data[i + 3] = 255
    }
    return {
        xres: W,
        yres: H,
        frameRateN: 30000,
        frameRateD: 1000,
        fourCC: grandiose.FOURCC_BGRA,
        pictureAspectRatio: W / H,
        frameFormatType: grandiose.FORMAT_TYPE_PROGRESSIVE,
        lineStrideBytes: W * 4,
        data
    }
}

function colourOf (frame) {
    const sum = [0, 0, 0]
    let n = 0
    for (let y = 0; y < frame.yres; y += 7) {
        for (let x = 0; x < frame.xres; x += 11) {
            const i = y * frame.lineStrideBytes + x * 4
            for (let c = 0; c < 3; c++) sum[c] += frame.data[i + c]
            n++
        }
    }
    const avg = sum.map((s) => s / n)
    return Object.keys(COLOURS).find((name) =>
        COLOURS[name].every((v, c) => Math.abs(v - avg[c]) < 40))
}

test("a receiver gets the frames a sender sends", async () => {
    const sender = await grandiose.send({ name: `grandiose-loopback-${process.pid}`, clockVideo: true })
    const finder = await grandiose.find({ showLocalSources: true })
    let sending = true
    let sendLoop = Promise.resolve()
    try {
        let source
        for (let i = 0; i < 40 && !source; i++) {
            await finder.wait(250)
            source = finder.sources().find((s) => s.name === sender.sourcename())
        }
        expect(source, "finder did not discover the local sender").toBeDefined()

        const receiver = await grandiose.receive({ source, colorFormat: grandiose.COLOR_FORMAT_BGRX_BGRA })
        const names = Object.keys(COLOURS)
        sendLoop = (async () => {
            for (let i = 0; sending; i++) await sender.video(solidFrame(COLOURS[names[Math.floor(i / 10) % 3]]))
        })()

        const seen = new Set()
        let shape
        for (let i = 0; i < 300 && seen.size < 3; i++) {
            const frame = await receiver.data(1000).catch(() => null)
            if (frame?.type !== "video") continue
            shape ??= [frame.xres, frame.yres, frame.fourCC, frame.data.length]
            const colour = colourOf(frame)
            if (colour) seen.add(colour)
        }
        expect(shape).toEqual([W, H, grandiose.FOURCC_BGRA, W * H * 4])
        expect([...seen].sort()).toEqual(["blue", "green", "red"])
        expect(sender.connections()).toBe(1)
    } finally {
        sending = false
        await sendLoop
        await finder.destroy()
        await sender.destroy()
    }
}, 30000)

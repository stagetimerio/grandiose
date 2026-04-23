export interface AudioFrame {
  type: 'audio'
  audioFormat: AudioFormat
  referenceLevel?: number // present only when audioFormat is Int16Interleaved
  sampleRate: number // Hz
  channels: number
  samples: number
  channelStrideInBytes: number
  timestamp: [number, number] // PTP timestamp
  timecode: [number, number] // timecode as PTP value
  metadata?: string // present when sender attaches metadata
  data: Buffer
}

export interface VideoFrame {
  type: 'video'
  xres: number
  yres: number
  frameRateN: number
  frameRateD: number
  fourCC: FourCC
  pictureAspectRatio: number
  timestamp: [ number, number ] // PTP timestamp
  frameFormatType: FrameType
  timecode: [ number, number ] // Measured in nanoseconds
  lineStrideBytes: number
  metadata?: string // present when sender attaches metadata
  data: Buffer
}

export interface MetadataFrame {
  type: 'metadata'
  length: number
  timecode: [number, number]
  data: string
}

export interface StatusChangeEvent { type: 'statusChange' }
export interface SourceChangeEvent { type: 'sourceChange' }

export type ReceivedFrame =
  | VideoFrame
  | AudioFrame
  | MetadataFrame
  | StatusChangeEvent
  | SourceChangeEvent

export interface VideoSendFrame {
  xres: number
  yres: number
  frameRateN: number
  frameRateD: number
  fourCC: FourCC
  pictureAspectRatio: number
  frameFormatType: FrameType
  lineStrideBytes: number
  data: Buffer
  timecode?: number | bigint // omitted = NDI synthesizes
}

export interface AudioSendFrame {
  sampleRate: number
  noChannels: number
  noSamples: number
  channelStrideBytes: number
  fourCC: FourCC
  data: Buffer
  timecode?: number | bigint
}

export interface Receiver {
  embedded: unknown
  video: (timeout?: number) => Promise<VideoFrame>
  audio: (params?: {
    audioFormat?: AudioFormat
    referenceLevel?: number
  }, timeout?: number) => Promise<AudioFrame>
  metadata: (timeout?: number) => Promise<MetadataFrame>
  data: (params?: {
    audioFormat?: AudioFormat
    referenceLevel?: number
  }, timeout?: number) => Promise<ReceivedFrame>
  source: Source
  colorFormat: ColorFormat
  bandwidth: Bandwidth
  allowVideoFields: boolean
  name?: string
}

export interface Sender {
  embedded: unknown
  destroy: () => Promise<void>
  video: (frame: VideoSendFrame) => Promise<void>
  audio: (frame: AudioSendFrame) => Promise<void>
  connections: () => number
  tally: () => { changed: boolean, on_program: boolean, on_preview: boolean }
  sourcename: () => string
  name: string
  clockVideo: boolean
  clockAudio: boolean
}

export interface Routing {
  name?: string
  groups?: string
  embedded: unknown
  destroy: () => Promise<void>
  change: (source: Source) => boolean
  clear: () => boolean
  connections: () => number
  sourcename: () => string
}

export interface Source {
  name: string
  urlAddress?: string
}

export const enum FrameType {
  Progressive = 1,
  Interlaced = 0,
  Field0 = 2,
  Field1 = 3,
}

export const enum ColorFormat {
  BGRX_BGRA = 0,
  UYVY_BGRA = 1,
  RGBX_RGBA = 2,
  UYVY_RGBA = 3,
  Fastest = 100,
  Best = 101
}

export const enum FourCC {
  UYVY = 1498831189,
  UYVA = 1096178005,
  P216 = 909193808,
  PA16 = 909197648,
  YV12 = 842094169,
  I420 = 808596553,
  NV12 = 842094158,
  BGRA = 1095911234,
  BGRX = 1481787202,
  RGBA = 1094862674,
  RGBX = 1480738642,
  FLTp = 1884572742
}

export const enum AudioFormat {
  Float32Separate = 0,
  Float32Interleaved = 1,
  Int16Interleaved = 2
}

export const enum Bandwidth {
  MetadataOnly = -10,
  AudioOnly = 10,
  Lowest = 0,
  Highest = 100
}

export interface Finder {
  embedded: unknown
  sources: () => Source[]
  wait: (timeout?: number) => Promise<boolean>
  destroy: () => Promise<void>
}

export function find(params?: {
  showLocalSources?: boolean
  groups?: string | string[]
  extraIPs?: string | string[]
}): Promise<Finder>

export function receive(params: {
  source: Source
  colorFormat?: ColorFormat
  bandwidth?: Bandwidth
  allowVideoFields?: boolean
  name?: string
}): Promise<Receiver>

export function send(params: {
  name: string
  clockVideo?: boolean
  clockAudio?: boolean
}): Promise<Sender>

export function routing(params: {
  name?: string
  groups?: string
}): Promise<Routing>


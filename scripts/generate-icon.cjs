/* Generates build/icon.png — OrangeDelay mark: orange lightning bolt on black
   with an orange frame. Pure Node (zlib), no image deps. Supersampled 2x. */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', 'build', 'icon.png')
const SIZE = 1024
const SS = 2 // supersample factor
const N = SIZE * SS

const BLACK = [10, 10, 10]
const ORANGE = [255, 94, 31]
const BG = [0, 0, 0]

// lucide "zap" polygon in a 24x24 viewbox
const BOLT = [
  [13, 2],
  [4, 14],
  [12, 14],
  [11, 22],
  [20, 10],
  [12, 10]
]

function pointInPoly(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0]
    const yi = poly[i][1]
    const xj = poly[j][0]
    const yj = poly[j][1]
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// map bolt viewbox (24) into a centered region of the canvas
const pad = N * 0.22
const scale = (N - pad * 2) / 24
const boltPx = BOLT.map(([x, y]) => [pad + x * scale, pad + y * scale])

const frameOuter = N * 0.06
const frameInner = N * 0.09

const buf = Buffer.alloc(N * N * 4)
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    let c = BG
    // frame band
    const nearEdge =
      x >= frameOuter &&
      y >= frameOuter &&
      x < N - frameOuter &&
      y < N - frameOuter &&
      (x < frameInner || y < frameInner || x >= N - frameInner || y >= N - frameInner)
    if (x < frameOuter || y < frameOuter || x >= N - frameOuter || y >= N - frameOuter) {
      c = BLACK
    } else if (nearEdge) {
      c = ORANGE
    } else {
      c = BLACK
    }
    if (pointInPoly(x + 0.5, y + 0.5, boltPx)) c = ORANGE
    const o = (y * N + x) * 4
    buf[o] = c[0]
    buf[o + 1] = c[1]
    buf[o + 2] = c[2]
    buf[o + 3] = 255
  }
}

// downsample SSxSS -> SIZE (box filter) for anti-aliasing
const out = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0
    let g = 0
    let b = 0
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const o = ((y * SS + dy) * N + (x * SS + dx)) * 4
        r += buf[o]
        g += buf[o + 1]
        b += buf[o + 2]
      }
    }
    const n = SS * SS
    const o = (y * SIZE + x) * 4
    out[o] = Math.round(r / n)
    out[o + 1] = Math.round(g / n)
    out[o + 2] = Math.round(b / n)
    out[o + 3] = 255
  }
}

// encode PNG
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return (~c) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
// scanlines with filter byte 0
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}
const idat = zlib.deflateSync(raw, { level: 9 })
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0))
])
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, png)
console.log('wrote', OUT, (png.length / 1024).toFixed(0) + 'KB', SIZE + 'x' + SIZE)

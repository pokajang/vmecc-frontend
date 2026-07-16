const zlib = require('node:zlib')

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }
  return crc >>> 0
})

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const pngChunk = (type, data = Buffer.alloc(0)) => {
  const typeBuffer = Buffer.from(type, 'ascii')
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

const createSmokePng = (seed = 'inspection-smoke', dimensions = {}) => {
  const key = String(seed)
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619) >>> 0
  }

  const normalizeDimension = (value, fallback) => {
    const number = Number(value)
    return Number.isInteger(number) && number > 0 && number <= 512 ? number : fallback
  }
  const width = normalizeDimension(dimensions.width, 48)
  const height = normalizeDimension(dimensions.height, 32)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  const pixel = Buffer.from([hash & 0xff, (hash >>> 8) & 0xff, (hash >>> 16) & 0xff, 255])
  const scanlines = []
  for (let row = 0; row < height; row += 1) {
    scanlines.push(Buffer.from([0]))
    for (let column = 0; column < width; column += 1) scanlines.push(pixel)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(scanlines))),
    pngChunk('IEND'),
  ])
}

module.exports = { createSmokePng }

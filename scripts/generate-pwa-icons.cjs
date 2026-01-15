/**
 * PWA Icon Generator Script
 * Generates placeholder icons for PWA with "kiBo" text
 * Run: node scripts/generate-pwa-icons.js
 */

const fs = require('node:fs')
const path = require('node:path')

// Icon sizes to generate
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Simple PNG generator using raw bytes
// Creates a solid color PNG with centered text-like pattern

function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // Helper to create CRC32
  function crc32(data) {
    let crc = 0xffffffff
    const table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  // Helper to create chunk
  function createChunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const typeBuffer = Buffer.from(type)
    const crcData = Buffer.concat([typeBuffer, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData), 0)
    return Buffer.concat([length, typeBuffer, data, crc])
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(2, 9) // color type (RGB)
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace

  // Image data - Blue background (#3B82F6) with white "K" pattern
  const bgR = 0x3b,
    bgG = 0x82,
    bgB = 0xf6
  const fgR = 0xff,
    fgG = 0xff,
    fgB = 0xff

  const rawData = Buffer.alloc(height * (1 + width * 3))

  // Draw background with simple "K" letter pattern
  const letterWidth = Math.floor(width * 0.4)
  const letterHeight = Math.floor(height * 0.5)
  const startX = Math.floor((width - letterWidth) / 2)
  const startY = Math.floor((height - letterHeight) / 2)
  const lineWidth = Math.max(2, Math.floor(width / 16))

  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3)
    rawData[rowStart] = 0 // filter byte

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3
      let isForeground = false

      // Check if pixel is part of "K" letter
      const relX = x - startX
      const relY = y - startY

      if (relX >= 0 && relX < letterWidth && relY >= 0 && relY < letterHeight) {
        // Vertical line of K
        if (relX < lineWidth) {
          isForeground = true
        }
        // Diagonal lines of K
        const midY = letterHeight / 2
        const diagOffset = Math.abs(relY - midY)
        const diagX = lineWidth + diagOffset * (letterWidth - lineWidth) / midY

        if (relX >= diagX - lineWidth / 2 && relX <= diagX + lineWidth / 2) {
          isForeground = true
        }
      }

      if (isForeground) {
        rawData[pixelStart] = fgR
        rawData[pixelStart + 1] = fgG
        rawData[pixelStart + 2] = fgB
      } else {
        rawData[pixelStart] = bgR
        rawData[pixelStart + 1] = bgG
        rawData[pixelStart + 2] = bgB
      }
    }
  }

  // Compress using zlib
  const zlib = require('node:zlib')
  const compressed = zlib.deflateSync(rawData, { level: 9 })

  // IDAT chunk
  const idat = createChunk('IDAT', compressed)

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0))

  // Combine all parts
  return Buffer.concat([signature, createChunk('IHDR', ihdr), idat, iend])
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'src', 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Generate icons
console.log('Generating PWA icons...')
for (const size of sizes) {
  const filename = `icon-${size}x${size}.png`
  const filepath = path.join(iconsDir, filename)
  const png = createPNG(size, size)
  fs.writeFileSync(filepath, png)
  console.log(`  Created: ${filename}`)
}

// Create apple-touch-icon (180x180)
const appleTouchIcon = createPNG(180, 180)
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouchIcon)
console.log('  Created: apple-touch-icon.png')

console.log('Done! Icons generated in src/public/icons/')

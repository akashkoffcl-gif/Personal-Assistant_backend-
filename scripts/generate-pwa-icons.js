const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 table implementation
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(width, height) {
  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // 3. Raw Scanline Data (RGBA)
  // Each scanline has 1 filter byte (0) + width * 4 bytes
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  // Color theme: Lavender/Purple #7C3AED (124, 58, 237) background with soft rounded box or letter M
  // Let's draw a rounded square with purple gradient and white letter M in center
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;
  const cornerRadius = width * 0.22;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rectangle test
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const halfSize = radius;

      let inBox = false;
      if (dx <= halfSize - cornerRadius && dy <= halfSize) {
        inBox = true;
      } else if (dx <= halfSize && dy <= halfSize - cornerRadius) {
        inBox = true;
      } else if (dx <= halfSize && dy <= halfSize) {
        const cornerDx = dx - (halfSize - cornerRadius);
        const cornerDy = dy - (halfSize - cornerRadius);
        if (cornerDx * cornerDx + cornerDy * cornerDy <= cornerRadius * cornerRadius) {
          inBox = true;
        }
      }

      if (inBox) {
        // Simple letter 'M' rendering in center
        // Normalized coordinates in [-1, 1] relative to center
        const nx = (x - cx) / (width * 0.28);
        const ny = (y - cy) / (height * 0.28);

        let inM = false;
        if (Math.abs(ny) <= 0.8 && Math.abs(nx) <= 0.85) {
          // Left stem
          if (nx >= -0.85 && nx <= -0.55 && ny >= -0.8 && ny <= 0.8) inM = true;
          // Right stem
          if (nx >= 0.55 && nx <= 0.85 && ny >= -0.8 && ny <= 0.8) inM = true;
          // Left diagonal: line from (-0.7, -0.8) to (0, 0.2)
          // equation: ny - (-0.8) = (1.0 / 0.7) * (nx - (-0.7)) => ny = 1.43 * nx + 0.2
          const diagLeftDist = Math.abs(ny - (1.43 * nx + 0.2));
          if (diagLeftDist < 0.28 && nx >= -0.7 && nx <= 0.05 && ny >= -0.8 && ny <= 0.3) inM = true;
          // Right diagonal: line from (0.7, -0.8) to (0, 0.2)
          const diagRightDist = Math.abs(ny - (-1.43 * nx + 0.2));
          if (diagRightDist < 0.28 && nx >= -0.05 && nx <= 0.7 && ny >= -0.8 && ny <= 0.3) inM = true;
        }

        if (inM) {
          // White letter 'M'
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          // Purple gradient #6935C8 to #8B45F5
          const grad = y / height;
          rawData[pixelOffset] = Math.round(105 + grad * 34);     // R: 105 -> 139
          rawData[pixelOffset + 1] = Math.round(53 + grad * 16);   // G: 53 -> 69
          rawData[pixelOffset + 2] = 245;                         // B: 245
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  // Deflate compressed data
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // 4. IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'apps', 'web', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const sizes = [
  { name: 'badge-72x72.png', size: 72 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
];

for (const s of sizes) {
  const filePath = path.join(iconsDir, s.name);
  const pngBuffer = generatePng(s.size, s.size);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`✓ Generated valid ${s.size}x${s.size} PNG at: ${filePath} (${pngBuffer.length} bytes)`);
}

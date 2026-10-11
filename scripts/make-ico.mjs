import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const srcPng = join(__dirname, "../public/icons/icon-512.png");
const outIco = join(__dirname, "../public/icons/app.ico");

async function generateIco() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(srcPng).resize(size, size).png().toBuffer();
    pngBuffers.push({ size, buf });
  }

  // ICO header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(pngBuffers.length, 4); // count

  const dirEntries = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0); // width
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1); // height
    entry.writeUInt8(0, 2); // colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buf.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    dirEntries.push(entry);
    currentOffset += item.buf.length;
  }

  const finalIco = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map((p) => p.buf),
  ]);

  writeFileSync(outIco, finalIco);
  console.log(`ICO dosyası üretildi: ${outIco} (${(finalIco.length / 1024).toFixed(1)} KB)`);
}

generateIco();

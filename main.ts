// main.ts — news-image-20261119 v3 entry runner.
// Validates entry.png (JPEG, 1024x1024, under the 1 MiB competition cap)
// and copies it byte-for-byte to MAKEFUN_OUTPUT_DIR (default ./out),
// so both grading runs see identical bytes.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, "entry.png");
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? join(here, "out");

const data = readFileSync(srcPath);

// Guard 1: a JPEG must start with the SOI marker FF D8 FF.
if (data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) {
  throw new Error("entry.png is not a JPEG: missing SOI marker");
}

// Guard 2: the competition cap is 1 MiB.
if (data.length > 1024 * 1024) {
  throw new Error(`entry.png is ${data.length} bytes, over the 1 MiB cap`);
}

// Guard 2b: a complete JPEG ends with the EOI marker FF D9. A file
// that was cut short mid-write would still pass the SOI check above,
// so verify the tail too before anything is copied out.
if (data[data.length - 2] !== 0xff || data[data.length - 1] !== 0xd9) {
  throw new Error("entry.png is truncated: missing EOI marker");
}

// Guard 3: dimensions must be 1024x1024. Scan the JPEG markers for the
// first Start-Of-Frame segment (baseline 0xC0 or progressive 0xC2);
// its payload holds height then width as big-endian 16-bit values.
function jpegSize(buf: Buffer): [number, number] {
  let pos = 2;
  while (pos + 9 < buf.length) {
    if (buf[pos] !== 0xff) throw new Error("entry.png: bad marker scan");
    const marker = buf[pos + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const height = buf.readUInt16BE(pos + 5);
      const width = buf.readUInt16BE(pos + 7);
      return [width, height];
    }
    const len = buf.readUInt16BE(pos + 2);
    pos += 2 + len;
  }
  throw new Error("entry.png: no SOF marker found");
}

const [width, height] = jpegSize(data);
if (width !== 1024 || height !== 1024) {
  throw new Error(`entry.png is ${width}x${height}, expected 1024x1024`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), data);
console.log(`entry.png OK: ${width}x${height}, ${data.length} bytes -> ${outDir}`);

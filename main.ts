// news-image-20261119 — v2 entrypoint.
// Copies the pre-rendered front-page image (entry.png) to the judge output
// directory, verifying it is a well-formed JPEG first. No network, no
// randomness: the output is always a byte-for-byte copy of the source.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ONE_MEBIBYTE = 1024 * 1024;
const SOURCE_NAME = "entry.png";

const here = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(here, SOURCE_NAME);

const picture = readFileSync(sourcePath);

if (picture.length > ONE_MEBIBYTE) {
  throw new Error(
    `entry image too large: ${picture.length} bytes exceeds the 1 MiB cap`,
  );
}

if (
  picture.length < 3 ||
  picture[0] !== 0xff ||
  picture[1] !== 0xd8 ||
  picture[2] !== 0xff
) {
  throw new Error("entry image is not a JPEG (missing FF D8 FF header)");
}

// Walk the JPEG marker segments until a Start-Of-Frame block is found and
// read the height and width it declares. SOF markers are 0xC0–0xCF except
// 0xC4, 0xC8 and 0xCC, which are not frame headers.
function measureJpeg(bytes: Buffer): { tall: number; wide: number } {
  let cursor = 2;
  while (cursor + 1 < bytes.length) {
    if (bytes[cursor] !== 0xff) {
      throw new Error(`JPEG marker scan derailed at offset ${cursor}`);
    }
    const tag = bytes[cursor + 1];
    if (tag === 0xd8 || tag === 0x01 || (tag >= 0xd0 && tag <= 0xd7)) {
      cursor += 2;
      continue;
    }
    if (cursor + 3 >= bytes.length) {
      throw new Error("JPEG ended before any frame header appeared");
    }
    const span = bytes.readUInt16BE(cursor + 2);
    const isFrame =
      tag >= 0xc0 && tag <= 0xcf && tag !== 0xc4 && tag !== 0xc8 && tag !== 0xcc;
    if (isFrame) {
      if (cursor + 8 >= bytes.length) {
        throw new Error("frame header is truncated");
      }
      return {
        tall: bytes.readUInt16BE(cursor + 5),
        wide: bytes.readUInt16BE(cursor + 7),
      };
    }
    cursor += 2 + span;
  }
  throw new Error("no Start-Of-Frame segment found in JPEG");
}

const frame = measureJpeg(picture);
if (frame.wide !== 1024 || frame.tall !== 1024) {
  throw new Error(
    `entry image must be 1024x1024, found ${frame.wide}x${frame.tall}`,
  );
}

const destinationDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(destinationDir, { recursive: true });

const destinationPath = join(destinationDir, SOURCE_NAME);
writeFileSync(destinationPath, picture);

const writtenBack = readFileSync(destinationPath);
if (!writtenBack.equals(picture)) {
  throw new Error("round-trip check failed: output differs from entry image");
}

console.log(
  `front page delivered: ${picture.length} bytes written to ${destinationPath}`,
);

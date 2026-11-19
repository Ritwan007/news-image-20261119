// Entry program for the make.fun competition news-image-20261119.
// It places the finished front page (entry.png, shipped in this
// repository) at the grader's output path. Node 22, standard library
// only, no network: both grading runs write byte-identical files.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

function looksLikeImage(bytes: Buffer): string {
  if (PNG_MAGIC.every((b, i) => bytes[i] === b)) return "PNG";
  if (JPEG_MAGIC.every((b, i) => bytes[i] === b)) return "JPEG";
  throw new Error("entry.png is neither PNG nor JPEG (bad magic bytes)");
}

const source = new URL("./entry.png", import.meta.url);
const bytes = readFileSync(source);
if (bytes.length > 1048576) {
  throw new Error(`entry.png is ${bytes.length} bytes, over the 1 MiB gate cap`);
}
const format = looksLikeImage(bytes);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output"; // /output in the grader; MAKEFUN_OUTPUT_DIR locally
mkdirSync(outDir, { recursive: true });
const target = join(outDir, "entry.png");
writeFileSync(target, bytes);
const written = readFileSync(target);
if (!written.equals(bytes)) throw new Error("output differs from entry.png");
console.log(`wrote ${format} entry.png (${bytes.length} bytes) to ${target}`);

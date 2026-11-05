/**
 * Download the real menu photos listed in tests/ocr/real-sources.json from Wikimedia Commons into
 * tests/ocr/real/ (git-ignored: the photos are linked, not redistributed). Used by the
 * "Real menu photos" GitHub Action:  node tests/ocr/real-fetch.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sources from "./real-sources.json" with { type: "json" };

// The app caps PaddleOCR input at 2000 px, so a 2400 px rendition loses nothing.
const WIDTH = 2400;
const dir = fileURLToPath(new URL("./real/", import.meta.url));
mkdirSync(dir, { recursive: true });
for (const s of sources) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(s.title.replace(/^File:/, ""))}?width=${WIDTH}`;
  const res = await fetch(url, { headers: { "User-Agent": "dishwise-ocr-eval/1.0 (https://github.com/bhnsadhu/dishwise)" } });
  if (!res.ok) throw new Error(`${s.file}: HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dir + s.file, buf);
  console.log(`${s.file}  ${(buf.length / 1024).toFixed(0)} KB  ${s.license}  ${s.title}`);
}

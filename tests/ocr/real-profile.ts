/**
 * Profile PaddleOCR on the real photos (tests/ocr/real/*.jpg, from real-fetch.ts), with the app's
 * preprocessing, under several detection sizes:  THREADS=1 node tests/ocr/real-profile.ts
 * Prints detection vs recognition time, box and dish counts, and (BOXES=1) the raw boxes as JSON
 * lines so layout fixes can be replayed offline without re-running OCR.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-web";
import { createPaddle, PADDLE_FILES } from "../../src/lib/menu/paddle.ts";
import { parseMenuText } from "../../src/lib/menu/parse.ts";
import { openPreprocessor } from "./browser-preprocess.ts";

const VARIANTS: { name: string; detection?: Record<string, unknown> }[] = [
  { name: "current (short side >= 736, no cap)" },
  { name: "long side <= 1600", detection: { limitType: "max", maxSideLength: 1600 } },
  { name: "long side <= 1280", detection: { limitType: "max", maxSideLength: 1280 } },
  { name: "long side <= 960", detection: { limitType: "max", maxSideLength: 960 } },
];
const dir = fileURLToPath(new URL("./real/", import.meta.url));
const read = (f: string) => readFileSync(fileURLToPath(new URL(`../../assets/ocr/pp-ocrv6-tiny/${f}`, import.meta.url)));
const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
ort.env.wasm.numThreads = Number(process.env.THREADS ?? 1);

const { preprocess, close } = await openPreprocessor();
const photos = readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort();
const prepared = await Promise.all(photos.map(async (f) => [f, await preprocess(dir + f, "paddle")] as const));
const summary: unknown[] = [];
for (const v of VARIANTS) {
  const engine = await createPaddle(ort, ab(read(PADDLE_FILES.det)), ab(read(PADDLE_FILES.rec)), read(PADDLE_FILES.dict).toString("utf8"), { detection: v.detection });
  console.log(`\n== ${v.name}, ${ort.env.wasm.numThreads} thread(s)`);
  for (const [f, img] of prepared) {
    const r = await engine.recognize({ width: img.width, height: img.height, data: img.rgba });
    const items = parseMenuText(r.lines).items;
    const priced = items.filter((i) => i.priceCents !== undefined || i.priceText).length;
    console.log(`${f} ${img.width}x${img.height}  det ${r.ms.det} ms  rec ${r.ms.rec} ms  boxes ${r.boxes.length}  dishes ${items.length} (${priced} priced)`);
    summary.push({ variant: v.name, threads: ort.env.wasm.numThreads, file: f, ...r.ms, boxes: r.boxes.length, dishes: items.length, priced });
    if (process.env.BOXES && v === VARIANTS[0]) {
      const compact = r.boxes.map((b) => [b.text, Math.round(b.confidence * 100), ...[b.box.x, b.box.y, b.box.width, b.box.height].map(Math.round), ...(b.box.points ?? []).flatMap((p) => [Math.round(p.x), Math.round(p.y)])]);
      console.log(`BOXES ${f} ${JSON.stringify(compact)}`);
    }
  }
}
writeFileSync(`${dir}profile-${ort.env.wasm.numThreads}t.json`, JSON.stringify(summary, null, 1));
await close();

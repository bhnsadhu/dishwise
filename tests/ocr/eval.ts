/**
 * OCR + parsing evaluation on rendered fixtures:  npm run eval:ocr
 * Measures OCR (character error rate) separately from menu parsing (dish precision/recall, price
 * and description accuracy), and also parses the *ground-truth* text to isolate parser errors from OCR errors.
 * Runs every engine on the same preprocessed image (ENGINES=tesseract,paddle by default).
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { build } from "esbuild";
import * as ort from "onnxruntime-web";
import { createWorker, PSM } from "tesseract.js";
import { createPaddle, PADDLE_FILES, PADDLE_PRESET } from "../../src/lib/menu/paddle.ts";
import { linesFromTesseract, parseMenuText, type OcrLine } from "../../src/lib/menu/parse.ts";
import { FIXTURES, imageFile, truthItems, truthLines, type Fixture } from "./fixtures.ts";

function lev(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9$€.,/ ]+/g, " ").replace(/\s+/g, " ").trim();
const similar = (a: string, b: string) => 1 - lev(norm(a), norm(b)) / Math.max(1, norm(a).length, norm(b).length);

function scoreParse(f: Fixture, items: { name: string; description?: string; priceCents?: number; priceText?: string }[]) {
  const truth = truthItems(f);
  const used = new Set<number>();
  let tp = 0;
  let priceOk = 0;
  let pricedTruth = 0;
  let descOk = 0;
  let describedTruth = 0;
  for (const t of truth) {
    if (t.price) pricedTruth++;
    if (t.description) describedTruth++;
    let best = -1;
    let bestSim = 0;
    items.forEach((it, i) => {
      const s = similar(t.name, it.name);
      if (!used.has(i) && s > bestSim) [best, bestSim] = [i, s];
    });
    if (best >= 0 && bestSim >= 0.8) {
      used.add(best);
      tp++;
      const it = items[best];
      if (t.price && (t.priceCents !== undefined ? it.priceCents === t.priceCents : norm(it.priceText ?? "") === norm(t.price))) priceOk++;
      if (t.description && similar(t.description, it.description ?? "") >= 0.8) descOk++;
    }
  }
  return {
    precision: items.length ? tp / items.length : truth.length ? 0 : 1,
    recall: truth.length ? tp / truth.length : items.length ? 0 : 1,
    priceAccuracy: pricedTruth ? priceOk / pricedTruth : 1,
    descriptionAccuracy: describedTruth ? descOk / describedTruth : 1,
    found: items.length,
    expected: truth.length,
  };
}

// Run the app's real preprocessing (src/lib/menu/preprocess.ts) in a browser canvas.
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../../src/lib/menu/preprocess.ts", import.meta.url))], bundle: true, format: "iife", globalName: "Pre", write: false });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });
async function preprocess(path: string, profile: "tesseract" | "paddle"): Promise<{ png: Buffer; width: number; height: number; rgba: Uint8Array }> {
  const b64 = readFileSync(path).toString("base64");
  const mime = path.endsWith(".jpg") ? "image/jpeg" : "image/png";
  const out = await page.evaluate(async ([b64, mime, profile]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Pre = (window as any).Pre;
    const img = new Image();
    img.src = `data:${mime};base64,${b64}`;
    await img.decode();
    const p = Pre.PROFILES[profile];
    const s = Pre.computeScale(img.width, img.height, p);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    const x = c.getContext("2d")!;
    x.imageSmoothingQuality = "high";
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height);
    Pre.enhanceGray(d.data, d.width, d.height, p.flattenLighting);
    x.putImageData(d, 0, 0);
    let raw = "";
    for (let i = 0; i < d.data.length; i += 8192) raw += String.fromCharCode(...d.data.subarray(i, i + 8192));
    return { png: c.toDataURL("image/png").split(",")[1], width: c.width, height: c.height, rgba: btoa(raw) };
  }, [b64, mime, profile]);
  return { png: Buffer.from(out.png, "base64"), width: out.width, height: out.height, rgba: new Uint8Array(Buffer.from(out.rgba, "base64")) };
}

type Engine = (img: Awaited<ReturnType<typeof preprocess>>) => Promise<{ lines: OcrLine[]; confidence: number }>;
type EngineName = "tesseract" | "paddle";
const engines: Record<EngineName, () => Promise<{ label: string; run: Engine; close: () => Promise<unknown> }>> = {
  async tesseract() {
    // Same model the browser downloads (@tesseract.js-data/eng 4.0.0_best_int); TESSERACT_LANG_PATH reads it from disk.
    const langPath = process.env.TESSERACT_LANG_PATH;
    const worker = await createWorker("eng", 1, langPath ? { langPath, cachePath: langPath } : {});
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
    return {
      label: "tesseract.js 7 (eng, LSTM)",
      run: async (img) => {
        const { data } = await worker.recognize(img.png, {}, { blocks: true, text: true });
        return { lines: linesFromTesseract(data.blocks ?? []), confidence: data.confidence };
      },
      close: () => worker.terminate(),
    };
  },
  async paddle() {
    const read = (f: string) => readFileSync(fileURLToPath(new URL(`../../assets/ocr/pp-ocrv6-tiny/${f}`, import.meta.url)));
    const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    ort.env.wasm.numThreads = 1;
    const engine = await createPaddle(ort, ab(read(PADDLE_FILES.det)), ab(read(PADDLE_FILES.rec)), read(PADDLE_FILES.dict).toString("utf8"));
    return {
      label: `PaddleOCR ${PADDLE_PRESET} (paddleocr + onnxruntime-web, wasm, 1 thread)`,
      run: (img) => engine.recognize({ width: img.width, height: img.height, data: img.rgba }),
      close: async () => {},
    };
  },
};

const results: Record<string, unknown> = {};
for (const name of (process.env.ENGINES ?? "tesseract,paddle").split(",") as EngineName[]) {
  const engine = await engines[name]();
  console.log(`\n== ${engine.label}`);
  const rows = [];
  for (const f of FIXTURES) {
    const img = fileURLToPath(new URL(`./images/${imageFile(f)}`, import.meta.url));
    const t0 = performance.now(); // OCR time including preprocessing
    const { lines, confidence } = await engine.run(await preprocess(img, name));
    const ms = Math.round(performance.now() - t0);
    // Order-insensitive (sorted words): CER measures recognition, not reading order.
    // Dot leaders ("Soupe ........ €9,50") are layout, not content, so they are left out.
    const bag = (t: string) => norm(t.replace(/[.…·]{2,}|\s[.…·](?=\s)/g, " ")).split(" ").filter(Boolean).sort().join(" ");
    const truthText = bag(truthLines(f).join(" "));
    const ocrText = bag(lines.map((l) => l.text).join(" "));
    const cer = truthText.length ? lev(truthText, ocrText) / truthText.length : ocrText.length ? 1 : 0;
    const parsed = parseMenuText(lines);
    if (process.env.DEBUG_OCR === f.id) console.log(JSON.stringify({ lines: lines.map((l) => l.text), items: parsed.items.map((i) => [i.name, i.description, i.priceCents, i.priceText]), ignored: parsed.ignored, bboxes: lines.map((l) => [l.text, l.bbox && Object.values(l.bbox).map(Math.round)]) }, null, 1));
    const fromOcr = scoreParse(f, parsed.items);
    const fromTruth = scoreParse(f, parseMenuText(truthLines(f).join("\n")).items);
    rows.push({ id: f.id, note: f.note, ms, cer, ocrConfidence: Math.round(confidence), fromOcr, fromTruth });
    console.log(
      `${f.id.padEnd(15)} CER ${(cer * 100).toFixed(1).padStart(5)}%  ocr→parse P ${fromOcr.precision.toFixed(2)} R ${fromOcr.recall.toFixed(2)} price ${fromOcr.priceAccuracy.toFixed(2)} desc ${fromOcr.descriptionAccuracy.toFixed(2)}  | truth→parse P ${fromTruth.precision.toFixed(2)} R ${fromTruth.recall.toFixed(2)} price ${fromTruth.priceAccuracy.toFixed(2)} desc ${fromTruth.descriptionAccuracy.toFixed(2)}  ${ms}ms`,
    );
  }
  await engine.close();
  results[name] = { engine: engine.label, rows };
}
await browser.close();
writeFileSync(fileURLToPath(new URL("./results.json", import.meta.url)), JSON.stringify({ ranAt: new Date().toISOString(), ...results }, null, 2));

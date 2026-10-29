/**
 * OCR + parsing evaluation on rendered fixtures:  npm run eval:ocr
 * Measures OCR (character error rate) separately from menu parsing (dish precision/recall, price
 * accuracy), and also parses the *ground-truth* text to isolate parser errors from OCR errors.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { build } from "esbuild";
import { createWorker, PSM } from "tesseract.js";
import { linesFromTesseract, parseMenuText } from "../../src/lib/menu/parse.ts";
import { FIXTURES, truthItems, truthLines, type Fixture } from "./fixtures.ts";

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

function scoreParse(f: Fixture, items: { name: string; priceCents?: number; priceText?: string }[]) {
  const truth = truthItems(f);
  const used = new Set<number>();
  let tp = 0;
  let priceOk = 0;
  let pricedTruth = 0;
  for (const t of truth) {
    if (t.price) pricedTruth++;
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
    }
  }
  return {
    precision: items.length ? tp / items.length : truth.length ? 0 : 1,
    recall: truth.length ? tp / truth.length : items.length ? 0 : 1,
    priceAccuracy: pricedTruth ? priceOk / pricedTruth : 1,
    found: items.length,
    expected: truth.length,
  };
}

// Run the app's real preprocessing (src/lib/menu/preprocess.ts) in a browser canvas.
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../../src/lib/menu/preprocess.ts", import.meta.url))], bundle: true, format: "iife", globalName: "Pre", write: false });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });
async function preprocess(path: string): Promise<Buffer> {
  const b64 = readFileSync(path).toString("base64");
  const out = await page.evaluate(async (b64) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Pre = (window as any).Pre;
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const s = Pre.computeScale(img.width, img.height);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    const x = c.getContext("2d")!;
    x.imageSmoothingQuality = "high";
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height);
    Pre.enhanceGray(d.data);
    x.putImageData(d, 0, 0);
    return c.toDataURL("image/png").split(",")[1];
  }, b64);
  return Buffer.from(out, "base64");
}

const worker = await createWorker("eng", 1);
await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
const rows = [];
for (const f of FIXTURES) {
  const img = fileURLToPath(new URL(`./images/${f.id}.png`, import.meta.url));
  const t0 = performance.now(); // OCR time including preprocessing
  const { data } = await worker.recognize(await preprocess(img), {}, { blocks: true, text: true });
  const ms = Math.round(performance.now() - t0);
  const lines = linesFromTesseract(data.blocks ?? []);
  // Order-insensitive (sorted words): CER measures recognition, not reading order.
  const bag = (t: string) => norm(t).split(" ").filter(Boolean).sort().join(" ");
  const truthText = bag(truthLines(f).join(" "));
  const ocrText = bag(lines.map((l) => l.text).join(" "));
  const cer = truthText.length ? lev(truthText, ocrText) / truthText.length : ocrText.length ? 1 : 0;
  const parsed = parseMenuText(lines);
  if (process.env.DEBUG_OCR === f.id) console.log(JSON.stringify({ lines: lines.map((l) => l.text), items: parsed.items.map((i) => [i.name, i.priceCents, i.priceText]) }, null, 1));
  const fromOcr = scoreParse(f, parsed.items);
  const fromTruth = scoreParse(f, parseMenuText(truthLines(f).join("\n")).items);
  rows.push({ id: f.id, note: f.note, ms, cer, ocrConfidence: Math.round(data.confidence), fromOcr, fromTruth });
  console.log(
    `${f.id.padEnd(15)} CER ${(cer * 100).toFixed(1).padStart(5)}%  ocr→parse P ${fromOcr.precision.toFixed(2)} R ${fromOcr.recall.toFixed(2)} price ${fromOcr.priceAccuracy.toFixed(2)}  | truth→parse P ${fromTruth.precision.toFixed(2)} R ${fromTruth.recall.toFixed(2)} price ${fromTruth.priceAccuracy.toFixed(2)}  ${ms}ms`,
  );
}
await worker.terminate();
await browser.close();
writeFileSync(fileURLToPath(new URL("./results.json", import.meta.url)), JSON.stringify({ ranAt: new Date().toISOString(), tesseract: "tesseract.js 7 (eng, LSTM)", rows }, null, 2));

/** Debug: print preprocessed OCR lines for one image:  node tests/ocr/debug-real.ts <path> */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { build } from "esbuild";
import { createWorker, PSM } from "tesseract.js";
import { linesFromTesseract, parseMenuText } from "../../src/lib/menu/parse.ts";

const bundle = await build({ entryPoints: [fileURLToPath(new URL("../../src/lib/menu/preprocess.ts", import.meta.url))], bundle: true, format: "iife", globalName: "Pre", write: false });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html></html>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });
const b64 = readFileSync(process.argv[2]).toString("base64");
const png = await page.evaluate(async (b64) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Pre = (window as any).Pre;
  const img = new Image(); img.src = `data:image/jpeg;base64,${b64}`; await img.decode();
  const s = Pre.computeScale(img.width, img.height);
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  const x = c.getContext("2d")!; x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height); Pre.enhanceGray(d.data); x.putImageData(d, 0, 0);
  return c.toDataURL("image/png").split(",")[1];
}, b64);
await browser.close();
const w = await createWorker("eng", 1);
await w.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
const { data } = await w.recognize(Buffer.from(png, "base64"), {}, { blocks: true });
await w.terminate();
for (const l of (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines)).slice(0, Number(process.argv[3] ?? 40))) {
  const h = l.bbox.y1 - l.bbox.y0;
  const gaps = l.words.slice(1).map((wd, i) => ((wd.bbox.x0 - l.words[i].bbox.x1) / h).toFixed(1));
  const bl = l.baseline;
  const at = (x: number) => bl.y0 + ((x - bl.x0) * (bl.y1 - bl.y0)) / Math.max(1, bl.x1 - bl.x0);
  const hs = l.words.map((wd) => `${wd.text}:${Math.round(at((wd.bbox.x0 + wd.bbox.x1) / 2) - wd.bbox.y0)}/${wd.bbox.y1 - wd.bbox.y0}`);
  console.log(`[x${l.bbox.x0} y${l.bbox.y0} h${h}] gaps/h=${gaps.join(",")}\n    ${hs.join(" ")}`);
}
console.log("---- parsed lines:");
for (const l of linesFromTesseract(data.blocks ?? []).slice(0, 30)) console.log(JSON.stringify(l.text), Math.round(l.bbox!.x0));
{
  const ls = linesFromTesseract(data.blocks ?? []);
  const { readingOrder, attachRowPrices } = await import("../../src/lib/menu/parse.ts");
  const ro = readingOrder(attachRowPrices(ls));
  console.log("---- columns:", ro.columns, "lines:", ls.length);
  const minX = Math.min(...ls.map((l) => l.bbox!.x0)), maxX = Math.max(...ls.map((l) => l.bbox!.x1));
  const cover = new Array(100).fill(0);
  for (const l of ls) for (let i = Math.floor(((l.bbox!.x0 - minX) / (maxX - minX)) * 99); i <= Math.floor(((l.bbox!.x1 - minX) / (maxX - minX)) * 99); i++) cover[i]++;
  console.log("cover:", cover.join(","));
  for (const l of ls.filter((l) => (l.bbox!.x0 + l.bbox!.x1) / 2 > minX + (maxX - minX) * 0.45 && l.bbox!.x0 < minX + (maxX - minX) * 0.68)) console.log("   straddle?", Math.round(l.bbox!.x0), Math.round(l.bbox!.x1), JSON.stringify(l.text.slice(0, 50)));
}
console.log("---- items:", parseMenuText(linesFromTesseract(data.blocks ?? [])).items.map((i) => i.name).join(" | "));

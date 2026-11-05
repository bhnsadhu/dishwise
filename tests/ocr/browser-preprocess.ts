/**
 * Runs the app's real preprocessing (src/lib/menu/preprocess.ts) in a browser canvas, so the
 * evaluation scripts feed each engine exactly what the scan page would.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { build } from "esbuild";

export interface Prepared {
  png: Buffer;
  width: number;
  height: number;
  rgba: Uint8Array;
}

export async function openPreprocessor() {
  const bundle = await build({ entryPoints: [fileURLToPath(new URL("../../src/lib/menu/preprocess.ts", import.meta.url))], bundle: true, format: "iife", globalName: "Pre", write: false });
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage();
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });

  async function preprocess(path: string, profile: "tesseract" | "paddle"): Promise<Prepared> {
    const b64 = readFileSync(path).toString("base64");
    const mime = path.endsWith(".jpg") ? "image/jpeg" : "image/png";
    const out = await page.evaluate(
      async ([b64, mime, profile]) => {
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
      },
      [b64, mime, profile],
    );
    return { png: Buffer.from(out.png, "base64"), width: out.width, height: out.height, rgba: new Uint8Array(Buffer.from(out.rgba, "base64")) };
  }

  return { preprocess, close: () => browser.close() };
}

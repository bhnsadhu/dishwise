"use client";

import type { OcrLine } from "./parse";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_SIDE = 2400;

export class ImageError extends Error {}

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  lowResolution: boolean;
}

/**
 * Decode (respecting EXIF rotation), downscale, convert to grayscale and stretch contrast between
 * the 2nd and 98th luminance percentiles. Helps with dim restaurant lighting and glossy paper.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new ImageError("That file isn't an image. Choose a photo of a menu (JPG, PNG or WebP).");
  if (file.size > MAX_UPLOAD_BYTES) throw new ImageError("That photo is over 15 MB. Try a smaller photo or a screenshot.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError(
      "This photo format couldn't be opened in your browser. Try a JPG or PNG (on iPhone, a screenshot of the photo works).",
    );
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ImageError("Your browser couldn't process the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const img = ctx.getImageData(0, 0, width, height);
  const px = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = y;
    hist[y]++;
  }
  const total = width * height;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.02; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.02; hi--);
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, width, height, lowResolution: Math.max(width, height) < 900 };
}

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  lines: OcrLine[];
  /** Mean word confidence for the page, 0–100. */
  confidence: number;
  text: string;
  ms: number;
}

const STATUS: Record<string, string> = {
  "loading tesseract core": "Loading the text reader",
  "initializing tesseract": "Starting the text reader",
  "loading language traineddata": "Loading English",
  "initializing api": "Getting ready",
  "recognizing text": "Reading the menu",
};

/** Run Tesseract.js (English) in a Web Worker. The image never leaves the device. */
export async function recognizeMenu(canvas: HTMLCanvasElement, onProgress: (p: OcrProgress) => void): Promise<OcrResult> {
  const started = performance.now();
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => onProgress({ status: STATUS[m.status] ?? m.status, progress: m.progress }),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
    const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
    const lines: OcrLine[] = (data.blocks ?? []).flatMap((b) =>
      b.paragraphs.flatMap((p) =>
        p.lines.map((l) => ({ text: l.text.replace(/\s+$/g, ""), confidence: l.confidence, bbox: l.bbox })),
      ),
    );
    return { lines, confidence: data.confidence, text: data.text, ms: Math.round(performance.now() - started) };
  } finally {
    await worker.terminate();
  }
}

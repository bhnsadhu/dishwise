"use client";

import type { WorkerMessage, WorkerRequest } from "./ocr.worker";
import { linesFromTesseract, type OcrLine } from "./parse";
import { computeScale, enhanceGray, PROFILES } from "./preprocess";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class ImageError extends Error {}

export type OcrEngine = "paddle" | "tesseract";

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  lowResolution: boolean;
  engine: OcrEngine;
  file: File;
}

/** Decode (respecting EXIF rotation), rescale for the engine, convert to grayscale, even out lighting and stretch contrast. */
export async function prepareImage(file: File, engine: OcrEngine = "paddle"): Promise<PreparedImage> {
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
  const profile = PROFILES[engine];
  const scale = computeScale(bitmap.width, bitmap.height, profile);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ImageError("Your browser couldn't process the image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const lowResolution = Math.max(bitmap.width, bitmap.height) < 700;
  bitmap.close();
  const img = ctx.getImageData(0, 0, width, height);
  enhanceGray(img.data, width, height, profile.flattenLighting);
  ctx.putImageData(img, 0, 0);
  return { canvas, width, height, lowResolution, engine, file };
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
  engine: OcrEngine;
}

const STATUS: Record<string, string> = {
  "loading tesseract core": "Loading the text reader",
  "initializing tesseract": "Starting the text reader",
  "loading language traineddata": "Loading English",
  "initializing api": "Getting ready",
  "recognizing text": "Reading the menu",
};

let paddleWorker: Worker | null = null;
let nextId = 0;

/** PaddleOCR (PP-OCRv6 tiny) in a Web Worker, kept alive between scans so the models load once. */
function recognizeWithPaddle(img: PreparedImage, onProgress: (p: OcrProgress) => void): Promise<Omit<OcrResult, "ms" | "engine">> {
  paddleWorker ??= new Worker(new URL("./ocr.worker.ts", import.meta.url), { type: "module" });
  const worker = paddleWorker;
  const ctx = img.canvas.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.type === "progress") {
        onProgress({ status: m.status === "loading" ? "Loading the text reader" : "Reading the menu", progress: m.progress });
        return;
      }
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (m.type === "done") resolve({ lines: m.lines, confidence: m.confidence, text: m.text });
      else reject(Object.assign(new Error(m.message), { stage: m.stage }));
    };
    const onError = (e: ErrorEvent) => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      paddleWorker?.terminate();
      paddleWorker = null;
      reject(Object.assign(new Error(e.message || "worker failed"), { stage: "load" }));
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ id, width: img.width, height: img.height, data } satisfies WorkerRequest, [data.buffer]);
  });
}

/** Tesseract.js (English) in its own Web Worker: the fallback when PaddleOCR can't start. */
async function recognizeWithTesseract(img: PreparedImage, onProgress: (p: OcrProgress) => void): Promise<Omit<OcrResult, "ms" | "engine">> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => onProgress({ status: STATUS[m.status] ?? m.status, progress: m.progress }),
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
    const { data } = await worker.recognize(img.canvas, {}, { blocks: true, text: true });
    return { lines: linesFromTesseract(data.blocks ?? []), confidence: data.confidence, text: data.text };
  } finally {
    await worker.terminate();
  }
}

/**
 * Read a prepared menu photo on the device. PaddleOCR first; if it fails for any reason (old
 * browser, no WebAssembly SIMD, blocked download, out of memory), the photo is re-prepared for
 * Tesseract and read with that.
 */
export async function recognizeMenu(img: PreparedImage, onProgress: (p: OcrProgress) => void): Promise<OcrResult> {
  const started = performance.now();
  if (img.engine === "paddle") {
    try {
      const r = await recognizeWithPaddle(img, onProgress);
      return { ...r, engine: "paddle", ms: Math.round(performance.now() - started) };
    } catch (e) {
      console.warn("PaddleOCR failed, using Tesseract:", e);
      img = await prepareImage(img.file, "tesseract");
    }
  }
  const r = await recognizeWithTesseract(img, onProgress);
  return { ...r, engine: "tesseract", ms: Math.round(performance.now() - started) };
}

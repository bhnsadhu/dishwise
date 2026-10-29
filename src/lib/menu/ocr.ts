"use client";

import { linesFromTesseract, type OcrLine } from "./parse";
import { computeScale, enhanceGray } from "./preprocess";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class ImageError extends Error {}

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  lowResolution: boolean;
}

/** Decode (respecting EXIF rotation), rescale for OCR, convert to grayscale and stretch contrast. */
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
  const scale = computeScale(bitmap.width, bitmap.height);
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
  enhanceGray(img.data);
  ctx.putImageData(img, 0, 0);
  return { canvas, width, height, lowResolution };
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
    const lines: OcrLine[] = linesFromTesseract(data.blocks ?? []);
    return { lines, confidence: data.confidence, text: data.text, ms: Math.round(performance.now() - started) };
  } finally {
    await worker.terminate();
  }
}

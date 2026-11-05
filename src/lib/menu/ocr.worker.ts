/// <reference lib="webworker" />
/**
 * PaddleOCR in a Web Worker, so detection and recognition never block the page. Everything is
 * served from this site: the bundler emits the models and ONNX Runtime's WASM binary as
 * content-hashed static files (cached as immutable). The image arrives as pixels and never leaves
 * the device.
 */
import * as ort from "onnxruntime-web/wasm";
import { createPaddle, type PaddleEngine } from "./paddle";
import type { OcrLine } from "./parse";

export type WorkerRequest = { id: number; width: number; height: number; data: Uint8ClampedArray };
export type WorkerMessage =
  | { id: number; type: "progress"; status: "loading" | "reading"; progress: number }
  | { id: number; type: "done"; lines: OcrLine[]; confidence: number; text: string }
  | { id: number; type: "error"; stage: "load" | "read"; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let engine: Promise<PaddleEngine> | null = null;

// Literal paths so the bundler can find and emit them (keep in sync with PADDLE_FILES).
const MODEL_URLS = {
  det: new URL("../../../assets/ocr/pp-ocrv6-tiny/PP-OCRv6_tiny_det.onnx", import.meta.url),
  rec: new URL("../../../assets/ocr/pp-ocrv6-tiny/PP-OCRv6_tiny_rec.onnx", import.meta.url),
  dict: new URL("../../../assets/ocr/pp-ocrv6-tiny/ppocrv6_tiny_dict.txt", import.meta.url),
};

async function download(url: URL, onBytes: (n: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url.pathname}: HTTP ${res.status}`);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    onBytes(value.byteLength);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out.buffer;
}

function load(onProgress: (p: number) => void): Promise<PaddleEngine> {
  // Threads need cross-origin isolation, which this site doesn't enable.
  ort.env.wasm.numThreads = scope.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  const total = 6_300_000; // approximate bytes of the three files, for the progress bar
  let got = 0;
  const bump = (n: number) => onProgress(Math.min(0.99, (got += n) / total));
  return Promise.all([download(MODEL_URLS.det, bump), download(MODEL_URLS.rec, bump), download(MODEL_URLS.dict, bump)]).then(([det, rec, dict]) =>
    createPaddle(ort, det, rec, new TextDecoder().decode(dict)),
  );
}

scope.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, width, height, data } = e.data;
  const post = (m: WorkerMessage) => scope.postMessage(m);
  let ready: PaddleEngine;
  try {
    engine ??= load((progress) => post({ id, type: "progress", status: "loading", progress }));
    ready = await engine;
  } catch (err) {
    engine = null;
    post({ id, type: "error", stage: "load", message: String(err) });
    return;
  }
  try {
    post({ id, type: "progress", status: "reading", progress: 0 });
    const result = await ready.recognize({ width, height, data }, (progress) => post({ id, type: "progress", status: "reading", progress }));
    post({ id, type: "done", ...result });
  } catch (err) {
    post({ id, type: "error", stage: "read", message: String(err) });
  }
};

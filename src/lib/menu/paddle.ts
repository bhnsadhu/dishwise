/**
 * PaddleOCR (PP-OCRv6 tiny, Apache-2.0 models) via the `paddleocr` runtime and ONNX Runtime.
 * Environment-neutral: the browser worker and the Node evaluation both build the engine here, so
 * they run identical settings.
 */
import type * as Ort from "onnxruntime-web";
import { PaddleOcrService } from "paddleocr";
import { linesFromBoxes, type OcrLine } from "./parse.ts";

export const PADDLE_PRESET = "PP-OCRv6_tiny";
/** In assets/ocr/pp-ocrv6-tiny/; see THIRD_PARTY_NOTICES.md for provenance and checksums. */
export const PADDLE_FILES = { det: "PP-OCRv6_tiny_det.onnx", rec: "PP-OCRv6_tiny_rec.onnx", dict: "ppocrv6_tiny_dict.txt" } as const;

/** PaddleOCR dictionaries are one character per line; `use_space_char` appends the space class. */
export function parseDictionary(text: string): string[] {
  return text.replace(/\r?\n$/, "").split(/\r?\n/).concat(" ");
}

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA, RGB or grayscale bytes. */
  data: Uint8Array | Uint8ClampedArray;
}

export interface PaddleEngine {
  /** `onProgress` reports 0–1: detection is the first 30%, recognising each line the rest. */
  recognize(img: PixelImage, onProgress?: (fraction: number) => void): Promise<{ lines: OcrLine[]; confidence: number; text: string }>;
}

// paddleocr declares a narrower ORT shape than onnxruntime-web's overloaded types; they are the same module at runtime.
type PaddleOrt = NonNullable<Parameters<typeof PaddleOcrService.createInstance>[0]>["ort"];

export async function createPaddle(ort: typeof Ort, det: ArrayBuffer, rec: ArrayBuffer, dictText: string): Promise<PaddleEngine> {
  const service = await PaddleOcrService.createInstance({
    ort: ort as unknown as PaddleOrt,
    modelPreset: PADDLE_PRESET,
    detection: { modelBuffer: det },
    recognition: { modelBuffer: rec, charactersDictionary: parseDictionary(dictText) },
  });
  return {
    async recognize(img, onProgress) {
      const data = img.data instanceof Uint8Array ? img.data : new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength);
      const results = await service.recognize(
        { width: img.width, height: img.height, data },
        {
          onProgress: onProgress
            ? (e) => {
                const f = e.progress.total ? e.progress.current / e.progress.total : 0;
                onProgress(e.type === "det" ? 0.3 * f : 0.3 + 0.7 * f);
              }
            : undefined,
        },
      );
      const lines = linesFromBoxes(results);
      // Character-weighted mean, comparable to Tesseract's page confidence (0–100).
      const chars = results.reduce((a, r) => a + r.text.length, 0);
      const confidence = chars ? (results.reduce((a, r) => a + r.confidence * r.text.length, 0) / chars) * 100 : 0;
      return { lines, confidence, text: lines.map((l) => l.text).join("\n") };
    },
  };
}

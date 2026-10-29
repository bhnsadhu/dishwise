/**
 * Pure image preprocessing for OCR (no DOM), shared by the browser pipeline and the evaluation.
 * Tesseract reads best when glyphs are ~30px tall, so small photos are upscaled and huge ones capped.
 */

export const TARGET_LONG_SIDE = 2000;
export const MAX_LONG_SIDE = 2600;
export const MAX_UPSCALE = 2.5;

export function computeScale(width: number, height: number): number {
  const long = Math.max(width, height);
  if (long <= 0) return 1;
  if (long < TARGET_LONG_SIDE) return Math.min(MAX_UPSCALE, TARGET_LONG_SIDE / long);
  return Math.min(1, MAX_LONG_SIDE / long);
}

/**
 * In-place: RGBA → grayscale, stretch contrast between the 2nd and 98th luminance percentiles, and
 * invert mostly-dark images.
 * Helps with dim restaurant lighting, tinted paper and glare.
 */
export function enhanceGray(px: Uint8ClampedArray): void {
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = y;
    hist[y]++;
  }
  const total = px.length / 4;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.02; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.02; hi--);
  const range = Math.max(1, hi - lo);
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((px[i] - lo) * 255) / range));
    px[i] = v;
    sum += v;
  }
  // Light text on a dark board (chalkboards): invert so Tesseract sees dark text on light.
  const invert = sum / total < 110;
  for (let i = 0; i < px.length; i += 4) {
    const v = invert ? 255 - px[i] : px[i];
    px[i] = px[i + 1] = px[i + 2] = v;
  }
}

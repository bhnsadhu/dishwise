/**
 * Pure image preprocessing for OCR (no DOM), shared by the browser pipeline and the evaluation.
 * Each engine has its own profile, tuned on tests/ocr (npm run eval:ocr):
 * - Tesseract reads best when glyphs are ~30px tall, so small photos are upscaled and huge ones
 *   capped. Lighting flattening amplifies grain for it, so it is off.
 * - PaddleOCR resizes text lines itself, so it only needs huge photos capped (smaller is faster),
 *   and it reads shadowed text far better once the lighting is flattened.
 */

export interface PreprocessProfile {
  /** Upscale images whose long side is below this. */
  targetLongSide: number;
  /** Downscale images whose long side is above this. */
  maxLongSide: number;
  maxUpscale: number;
  flattenLighting: boolean;
}

export const PROFILES = {
  tesseract: { targetLongSide: 2000, maxLongSide: 2600, maxUpscale: 2.5, flattenLighting: false },
  paddle: { targetLongSide: 0, maxLongSide: 2000, maxUpscale: 1, flattenLighting: true },
} satisfies Record<string, PreprocessProfile>;

export function computeScale(width: number, height: number, p: PreprocessProfile = PROFILES.tesseract): number {
  const long = Math.max(width, height);
  if (long <= 0) return 1;
  if (long < p.targetLongSide) return Math.min(p.maxUpscale, p.targetLongSide / long);
  return Math.min(1, p.maxLongSide / long);
}

/**
 * In-place: RGBA → grayscale, invert mostly-dark images (chalkboards), flatten uneven lighting,
 * then stretch contrast between the 2nd and 98th luminance percentiles.
 * Helps with dim restaurant lighting, tinted paper, glare and shadows across part of the page.
 */
export function enhanceGray(px: Uint8ClampedArray, width: number, height: number, flatten = false): void {
  const n = px.length / 4;
  const gray = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const y = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
    gray[i] = y;
    hist[y]++;
  }
  // Light text on a dark board: invert so the text is dark on light, like paper.
  let acc = 0;
  let median = 0;
  while (median < 255 && (acc += hist[median]) < n / 2) median++;
  if (median < 110) for (let i = 0; i < n; i++) gray[i] = 255 - gray[i];

  if (flatten && width * height === n) flattenLighting(gray, width, height);

  hist.fill(0);
  for (let i = 0; i < n; i++) hist[Math.round(gray[i])]++;
  let lo = 0;
  let hi = 255;
  for (acc = 0; lo < 255 && (acc += hist[lo]) < n * 0.02; lo++);
  for (acc = 0; hi > 0 && (acc += hist[hi]) < n * 0.02; hi--);
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, ((gray[i] - lo) * 255) / range));
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
  }
}

/**
 * Divide out the paper's brightness (flat-field correction). The background is estimated as the
 * brightest value in coarse blocks (text is darker than paper, so it drops out), widened and
 * smoothed over neighbouring blocks, then interpolated back to full size.
 */
export function flattenLighting(gray: Float32Array, width: number, height: number): void {
  const block = Math.max(8, Math.round(Math.max(width, height) / 90));
  const bw = Math.ceil(width / block);
  const bh = Math.ceil(height / block);
  let grid = new Float32Array(bw * bh);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / block) * bw;
    for (let x = 0; x < width; x++) {
      const g = row + Math.floor(x / block);
      const v = gray[y * width + x];
      if (v > grid[g]) grid[g] = v;
    }
  }
  // 3×3 max (so a bold letter filling a block doesn't read as shadow), then two 3×3 box blurs.
  const pass = (src: Float32Array, op: "max" | "mean") => {
    const out = new Float32Array(src.length);
    for (let gy = 0; gy < bh; gy++)
      for (let gx = 0; gx < bw; gx++) {
        let m = 0;
        let c = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const x = gx + dx;
            const y = gy + dy;
            if (x < 0 || y < 0 || x >= bw || y >= bh) continue;
            const v = src[y * bw + x];
            if (op === "max") m = Math.max(m, v);
            else m += v;
            c++;
          }
        out[gy * bw + gx] = op === "max" ? m : m / c;
      }
    return out;
  };
  grid = pass(pass(pass(grid, "max"), "mean"), "mean");
  for (let y = 0; y < height; y++) {
    const fy = Math.min(bh - 1, Math.max(0, (y + 0.5) / block - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(bh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(bw - 1, Math.max(0, (x + 0.5) / block - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(bw - 1, x0 + 1);
      const tx = fx - x0;
      const bg =
        (grid[y0 * bw + x0] * (1 - tx) + grid[y0 * bw + x1] * tx) * (1 - ty) + (grid[y1 * bw + x0] * (1 - tx) + grid[y1 * bw + x1] * tx) * ty;
      const i = y * width + x;
      gray[i] = Math.min(255, (gray[i] * 255) / Math.max(24, bg));
    }
  }
}

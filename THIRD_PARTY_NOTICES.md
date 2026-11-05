# Third-party notices

## Code and ideas

| Source | License | How it is used |
| --- | --- | --- |
| [iamAyushSaxena/ML-Restaurant-Recommendations](https://github.com/iamAyushSaxena/ML-Restaurant-Recommendations) | MIT, © 2026 Ayush Saxena | Ideas adapted, not copied: weighted cold-start scoring, per-category diversity limits, typed recommendation reasons, ranking metrics (precision@k / NDCG). Re-implemented in TypeScript for dishes rather than restaurants. Its synthetic data and reported metrics are not used. |
| [pranavpatnaik1/PalateMap](https://github.com/pranavpatnaik1/PalateMap) | No license published | Conceptual inspiration only (flavour vectors from menu OCR, rating feedback loop). No code reused. PalateMap won 1st place at Solstice by APEERS 2024; that award belongs to its authors, not to Dishwise. |
| [paddleocr](https://github.com/x3zvawq/paddleocr.js) (paddleocr.js) | MIT, © x3zvawq | npm dependency: PaddleOCR pre/post-processing (DB text detection, CTC decoding) in TypeScript. Used unmodified; audited before adoption (no network access, `eval` or install scripts). |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) | MIT, © Microsoft | npm dependency that runs the PaddleOCR models in WebAssembly. Its WASM binary is bundled and served by the site. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Apache-2.0 | npm dependency for in-browser OCR, now the fallback when PaddleOCR can't start. |

## Runtime dependencies
Next.js, React (MIT), Tailwind CSS (MIT), Drizzle ORM (Apache-2.0), @neondatabase/serverless (MIT), Zod (MIT). Full license texts are in `node_modules/<package>/LICENSE`.

## Icons
GitHub mark: path from [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0-1.0). The GitHub logo is a trademark of GitHub, Inc.; it only labels the link to this project's repository and implies no endorsement.

## Data
The OCR evaluation fixtures (`tests/ocr/`) are fictional menus written and rendered for Dishwise.
The ingredient lexicon, dish archetypes and sample menus in `src/lib/` were written for Dishwise. The sample restaurants are fictional.

## Fonts
Figtree (SIL Open Font License 1.1), via Google Fonts: self-hosted at build time by `next/font`, plus two Latin TTF weights in `assets/fonts/` for the generated share image.

## Runtime assets
**PaddleOCR PP-OCRv6 tiny** text detection and recognition models and their character dictionary, in `assets/ocr/pp-ocrv6-tiny/`, served by the site. They are © PaddlePaddle Authors, Apache-2.0 ([PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)). The ONNX files were converted from PaddlePaddle's official weights by [OnnxOCR](https://github.com/jingsongliujing/OnnxOCR) (Apache-2.0) and taken unmodified from its PyPI wheel `onnxocr==4.0.0` (`onnxocr/models/ppocrv6/tiny/`), then renamed:

| File | SHA-256 |
| --- | --- |
| `PP-OCRv6_tiny_det.onnx` (from `tiny/det/det.onnx`) | `193bab7a04fca699a6c82e6abb5b81bdb28177f0abd4062552b04908dafb19f8` |
| `PP-OCRv6_tiny_rec.onnx` (from `tiny/rec/rec.onnx`) | `9ef676d6ed3c88256a2d92c640c44f25b0c40947e111b14b8be8f594091563e6` |
| `ppocrv6_tiny_dict.txt` (from `ppocrv6/ppocrv6_tiny_dict.txt`) | `2af150bab777d86fa1ce821f6a37eabea90f1bb99ab9c41f031262e892a747bc` |

PaddlePaddle also publishes its own ONNX export (`PP-OCRv6_tiny_{det,rec}_onnx_infer.tar` on paddle-model-ecology.bj.bcebos.com), which can be swapped in.

Only if PaddleOCR can't start, Tesseract.js downloads its WASM core and the English `eng.traineddata` model (Apache-2.0, tesseract-ocr/tessdata) from the jsDelivr CDN. Only these model files are fetched; menu photos never leave the browser.

## Dev tooling
Playwright (Apache-2.0), Vitest (MIT), PGlite (Apache-2.0), Drizzle Kit (MIT), esbuild (MIT).

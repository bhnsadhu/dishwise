# Third-party notices

## Code and ideas

| Source | License | How it is used |
| --- | --- | --- |
| [iamAyushSaxena/ML-Restaurant-Recommendations](https://github.com/iamAyushSaxena/ML-Restaurant-Recommendations) | MIT, © 2026 Ayush Saxena | Ideas adapted, not copied: weighted cold-start scoring, per-category diversity limits, typed recommendation reasons, ranking metrics (precision@k / NDCG). Re-implemented in TypeScript for dishes rather than restaurants. Its synthetic data and reported metrics are not used. |
| [pranavpatnaik1/PalateMap](https://github.com/pranavpatnaik1/PalateMap) | No license published | Conceptual inspiration only (flavour vectors from menu OCR, rating feedback loop). No code reused. PalateMap won 1st place at Solstice by APEERS 2024; that award belongs to its authors, not to Dishwise. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Apache-2.0 | npm dependency for in-browser OCR. |

## Runtime dependencies
Next.js, React (MIT), Tailwind CSS (MIT), Drizzle ORM (Apache-2.0), @neondatabase/serverless (MIT), Zod (MIT). Full license texts are in `node_modules/<package>/LICENSE`.

## Icons
GitHub mark: path from [Simple Icons](https://github.com/simple-icons/simple-icons) (CC0-1.0). The GitHub logo is a trademark of GitHub, Inc.; it only labels the link to this project's repository and implies no endorsement.

## Data
The ingredient lexicon, dish archetypes and sample menus in `src/lib/` were written for Dishwise. The sample restaurants are fictional.

## Fonts
Figtree (SIL Open Font License 1.1), via Google Fonts: self-hosted at build time by `next/font`, plus two Latin TTF weights in `assets/fonts/` for the generated share image.

## Runtime assets
Tesseract.js downloads its WASM core and the English `eng.traineddata` model (Apache-2.0, tesseract-ocr/tessdata) from the jsDelivr CDN on first scan. Only these model files are fetched; menu photos never leave the browser.

## Dev tooling
Playwright (Apache-2.0), Vitest (MIT), PGlite (Apache-2.0), Drizzle Kit (MIT), esbuild (MIT).

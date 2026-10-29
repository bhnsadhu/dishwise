# Third-party notices

## Code and ideas

| Source | License | How it is used |
| --- | --- | --- |
| [iamAyushSaxena/ML-Restaurant-Recommendations](https://github.com/iamAyushSaxena/ML-Restaurant-Recommendations) | MIT, © 2026 Ayush Saxena | Ideas adapted, not copied: weighted cold-start scoring, per-category diversity limits, typed recommendation reasons, ranking metrics (precision@k / NDCG). Re-implemented in TypeScript for dishes rather than restaurants. Its synthetic data and reported metrics are not used. |
| [pranavpatnaik1/PalateMap](https://github.com/pranavpatnaik1/PalateMap) | No license published | Conceptual inspiration only (flavour vectors from menu OCR, rating feedback loop). No code reused. PalateMap won 1st place at Solstice by APEERS 2024; that award belongs to its authors, not to Dishwise. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Apache-2.0 | npm dependency for in-browser OCR. |

## Runtime dependencies
Next.js, React (MIT), Tailwind CSS (MIT), Drizzle ORM (Apache-2.0), @neondatabase/serverless (MIT), Zod (MIT). Full license texts are in `node_modules/<package>/LICENSE`.

## Data
The ingredient lexicon, dish archetypes and sample menus in `src/lib/` were written for Dishwise. The sample restaurants are fictional.

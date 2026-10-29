# Progress

## Done
- Next.js 16 / TypeScript / Tailwind foundation, Vitest, repo-local verified git identity.
- Recommendation engine: enrichment with provenance, additive explainable scoring, rating-based learning, dietary safety, MMR diversity, evidence refs.
- OCR text parser: prices, sections, descriptions, two-column layouts, noise handling.
- Five fictional sample menus.
- 48 unit tests passing (`npm run check`).
- Design checkpoint: three working directions published for review.

## Current milestone
Visual direction approval → then build the real UI on the approved direction.

## Next (independent of design)
- Tesseract.js wrapper with preprocessing, progress and review/correction screen.
- Guest persistence (localStorage) for profile + feedback.
- Drizzle schema + migrations (tested against PGlite), Neon Auth.

## Blockers
- **Design approval** (user).
- **Neon project + Neon Auth credentials** (user) for account persistence. Guest mode works without them.

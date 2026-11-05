# Progress

## Done
- **Design**: wordmark and icon approved (bowl and tick, 2026-10-30); "Saffron" consumer-app design across every page, with a phone tab bar, a laptop top bar, a dish dialog and light/dark themes (docs/DESIGN.md). It replaced the earlier "Marked-Up Menu" direction on 2026-10-29.
- **Engine**: enrichment with stated/inferred provenance, additive explainable scoring, rating-based learning, dietary safety, MMR diversity, evidence refs.
- **Menu input**: in-browser PaddleOCR (PP-OCRv6 tiny on ONNX Runtime Web, in a Web Worker) with a Tesseract.js fallback, per-engine preprocessing (flat-field lighting correction for PaddleOCR), column- and price-aware parsing, an editable review step, and the typed/pasted path (including menus pasted from delivery apps) through the same parser.
- **Product**: home with a live ranked example, scan, results with dish dialog, taste editor, Saved, account, How it works.
- **Data**: Neon Postgres (free, via Vercel Marketplace) with Drizzle migrations applied; Neon Auth; user-scoped DAL; guest localStorage with merge on first sign-in; account and data deletion.
- **Tests**: 112 unit/integration tests; 132 Playwright E2E runs passing on production (2 skipped, need a real test account; re-run any time with the "Verify production" GitHub Action); an OCR evaluation; a real-photo check (docs/EVALUATION.md).

## Deployed
- Production: https://dishwise.bhanusadhu.com (also https://dishwise-alpha.vercel.app), via manual `vercel deploy --prod` or the one-click **Deploy to production** GitHub Action (Actions tab → Run workflow; needs the `VERCEL_TOKEN` repository secret). No auto-deploy on push.
- Neon Auth trusted domains: dishwise.bhanusadhu.com, dishwise-alpha.vercel.app, dishwise-bhanu-sadhu-s-projects.vercel.app.

## Verified
- 2026-10-29: real accounts on production (sign-up with guest merge, cross-session sync, sign-out, wrong-password recovery), confirmed in the live database.
- 2026-10-30: full E2E suite against production after the redesign and dark mode.

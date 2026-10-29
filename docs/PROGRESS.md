# Progress

## Done
- **Design**: direction C "Marked-Up Menu" approved and implemented across every page (docs/DESIGN.md).
- **Engine**: enrichment with stated/inferred provenance, additive explainable scoring, rating-based learning, dietary safety, MMR diversity, evidence refs, pen-mark mapping.
- **Menu input**: in-browser Tesseract.js OCR with preprocessing, column- and price-aware parsing, an editable review step, and the typed/pasted path through the same parser.
- **Product**: home, taste card with live preview, menus, results with dish sheet, notebook, account, How it works.
- **Data**: Neon Postgres (free, via Vercel Marketplace) with Drizzle migrations applied; Neon Auth; user-scoped DAL; guest localStorage with merge on first sign-in; account and data deletion.
- **Tests**: 96 unit/integration tests, 108 Playwright E2E runs on production (2 skipped, need a real test account), an OCR evaluation, and a real-photo check (docs/EVALUATION.md).

## Deployed
- Production (approved 2026-10-29): https://dishwise.bhanusadhu.com (also https://dishwise-alpha.vercel.app) via manual `vercel deploy --prod` (no Git auto-deploy).

## Needs the owner
- Neon Console → Auth → Configuration → Domains: add `https://dishwise-alpha.vercel.app` and `https://dishwise.bhanusadhu.com` so sign-in works in production (localhost is pre-approved).
- A test account to run the signed-in E2E test (`E2E_EMAIL`, `E2E_PASSWORD`).
- Sign-off on the wordmark (currently the name set in Gloock).

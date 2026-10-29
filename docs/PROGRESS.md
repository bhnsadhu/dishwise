# Progress

## Done
- **Design**: direction C "Marked-Up Menu" approved and implemented across every page (docs/DESIGN.md).
- **Engine**: enrichment with stated/inferred provenance, additive explainable scoring, rating-based learning, dietary safety, MMR diversity, evidence refs, pen-mark mapping.
- **Menu input**: in-browser Tesseract.js OCR with preprocessing, column- and price-aware parsing, an editable review step, and the typed/pasted path through the same parser.
- **Product**: home, taste card with live preview, menus, results with dish sheet, notebook, account, How it works.
- **Data**: Neon Postgres (free, via Vercel Marketplace) with Drizzle migrations applied; Neon Auth; user-scoped DAL; guest localStorage with merge on first sign-in; account and data deletion.
- **Tests**: 83 unit/integration tests, 24 Playwright E2E runs (2 skipped, need a test account), and an OCR evaluation (docs/EVALUATION.md).

## Deployed
- Production (approved 2026-10-29): https://dishwise-alpha.vercel.app via manual `vercel deploy --prod` (no Git auto-deploy).

## Needs the owner
- Attach `dishwise.bhanusadhu.com` to the project (`vercel domains add dishwise.bhanusadhu.com dishwise`); DNS is on Vercel, so no record to add by hand.
- Neon Console → Auth → Configuration → Domains: add `https://dishwise-alpha.vercel.app` and `https://dishwise.bhanusadhu.com` so sign-in works in production (localhost is pre-approved).
- A test account to run the signed-in E2E test (`E2E_EMAIL`, `E2E_PASSWORD`).
- Sign-off on the wordmark (currently the name set in Gloock).

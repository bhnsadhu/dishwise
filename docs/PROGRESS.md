# Progress

## Done
- **Design**: direction C "Marked-Up Menu" approved and implemented across every page (docs/DESIGN.md).
- **Engine**: enrichment with stated/inferred provenance, additive explainable scoring, rating-based learning, dietary safety, MMR diversity, evidence refs, pen-mark mapping.
- **Menu input**: in-browser Tesseract.js OCR with preprocessing, column- and price-aware parsing, an editable review step, and the typed/pasted path through the same parser.
- **Product**: home, taste card with live preview, menus, results with dish sheet, notebook, account, How it works.
- **Data**: Neon Postgres (free, via Vercel Marketplace) with Drizzle migrations applied; Neon Auth; user-scoped DAL; guest localStorage with merge on first sign-in; account and data deletion.
- **Tests**: 83 unit/integration tests, 24 Playwright E2E runs (2 skipped, need a test account), and an OCR evaluation (docs/EVALUATION.md).

## Next
- Deployment prep: Vercel project settings (framework = Next.js), `NEON_AUTH_COOKIE_SECRET` in Vercel env, Neon Auth trusted origins for the production domain, custom domain instructions.
- Optional polish: a provisional wordmark/favicon for owner approval, and OG image.

## Needs the owner
- **Approval to deploy publicly** (Vercel production + `dishwise.bhanusadhu.com` DNS).
- A test account to run the signed-in E2E test (`E2E_EMAIL`, `E2E_PASSWORD`).
- Sign-off on the wordmark (currently the name set in Gloock).

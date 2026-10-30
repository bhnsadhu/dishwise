# Decisions

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-29 | Deterministic, additive scorer instead of an ML model | Explanations are exact (contributions sum to the score), works with zero data, no paid inference, easy to test and discuss. |
| 2026-10-29 | Every dish attribute tagged `stated` or `inferred`; unknowns stay unknown | Menus are incomplete. Honesty about provenance matters for diet and allergy safety. |
| 2026-10-29 | No collaborative filtering | A portfolio app won't have real multi-user data, and synthetic users would fake personalization. |
| 2026-10-29 | OCR and ranking run in the browser | $0 cost, photos never leave the device, instant feedback. |
| 2026-10-29 | Profiles stored as validated JSON (zod) rather than one table per preference | Profiles are always read and written whole. A JSON column keeps the schema small while zod still enforces shape. |
| 2026-10-29 | Portfolio-first scope | Optimize for recruiting impact per effort (user direction). |
| 2026-10-29 | Visual direction **C · Marked-Up Menu** approved by user | Most original, menu-native, makes stated-vs-inferred honesty visible; see docs/DESIGN.md |
| 2026-10-29 | Neon provisioned via Vercel Marketplace (free plan, Neon Auth on); Vercel project created **without** Git connection | Keeps $0; avoids auto-deploying unfinished work on every push |
| 2026-10-29 | Pages are static shells + client components; signed-in data via authenticated `/api/me/*` route handlers | Engine runs client-side anyway; keeps Cache Components simple (no session reads in layouts) |
| 2026-10-29 | Replaced direction C with **Saffron**, a consumer-app design (owner-approved from mockups) | Recruiters and diners should see a product they'd use at the table, not a concept piece; see docs/DESIGN.md |
| 2026-10-29 | Light/dark theme follows the system, with a manual toggle | Diners often read menus in dim restaurants; set before first paint so there is no flash |
| 2026-10-30 | Wordmark **A · bowl & tick** approved by owner (over a typographic i-dot and a match-pill wordmark) | Continues the live mark and reads at favicon size; one SVG drives every logo surface |

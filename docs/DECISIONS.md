# Decisions

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-29 | Deterministic, additive scorer instead of an ML model | Explanations are exact (contributions sum to the score), works with zero data, no paid inference, easy to test and discuss. |
| 2026-10-29 | Every dish attribute tagged `stated` or `inferred`; unknowns stay unknown | Menus are incomplete. Honesty about provenance matters for diet and allergy safety. |
| 2026-10-29 | No collaborative filtering | A portfolio app won't have real multi-user data, and synthetic users would fake personalization. |
| 2026-10-29 | OCR and ranking run in the browser | $0 cost, photos never leave the device, instant feedback. |
| 2026-10-29 | Profiles stored as validated JSON (zod) rather than one table per preference | Profiles are always read and written whole. A JSON column keeps the schema small while zod still enforces shape. |
| 2026-10-29 | Portfolio-first scope | Optimize for recruiting impact per effort (user direction). |

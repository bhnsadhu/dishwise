# Costs

Dishwise is designed to cost **$0** to run as a personal, non-commercial portfolio project. No paid APIs are used. Billing is never enabled.

| Service | Plan | What Dishwise uses | Free limit (checked 2026-10-29) | If exceeded |
| --- | --- | --- | --- | --- |
| Vercel | Hobby | Hosting, server functions for saving profiles/ratings | 1M function invocations, 4 active CPU-hrs, 100 GB fast data transfer, 1M CDN requests / month. **Non-commercial use only.** | Features pause until the 30-day window resets. No charge on Hobby. |
| Neon Postgres | Free | Accounts' profiles, saved dishes, ratings | 100 CU-hrs compute, 0.5 GB storage per project / month; compute scales to zero after 5 min idle | Compute suspends until next month. No charge on Free. |
| Neon Auth | Free (included) | Sign-in for cross-device sync | Available on Free plan | — |
| Tesseract.js | Open source | OCR runs **in the visitor's browser** | No server cost | — |

## Why this stays cheap
- OCR and ranking run client-side. The server only stores small JSON rows for signed-in users.
- Guests never touch the database; their data stays in `localStorage`.
- Menu photos are never uploaded.
- Inputs are size-capped with zod (≤250 menu items, ≤40 ingredients per list). A per-user cap on feedback rows is planned for the persistence API.

## Risks
- Neon's 0.5 GB storage is the tightest limit. At ~1 KB per feedback row, that is roughly 500k rows, far beyond portfolio traffic.
- A traffic spike (e.g. a post going viral) could pause the Hobby project for the rest of the month. It would not create a bill.

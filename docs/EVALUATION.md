# Evaluation

All numbers here come from runs on 2026-10-29 on a MacBook (Node 24, Chromium via Playwright). Nothing is extrapolated. Dishwise has no real-user data yet, so there are no satisfaction, retention or real-world accuracy figures.

## OCR and menu parsing (`npm run eval:ocr`)
Seven fictional menus are rendered to PNG by a real browser (`tests/ocr/render.ts`), each with exact ground truth (`tests/ocr/fixtures.ts`). The script runs the app's own preprocessing in a browser canvas, then Tesseract.js 7 (English, LSTM), then the app's parser. It reports three things separately:

- **CER**: OCR character error rate over the words (order-insensitive, so it measures recognition rather than reading order).
- **OCR → parse**: dishes found from the OCR output (precision P, recall R) and how many prices were read correctly.
- **Truth → parse**: the parser run on perfect text, to separate parser errors from OCR errors.

| Fixture | What it tests | CER | OCR→parse P / R | Prices correct | Truth→parse P / R / prices |
| --- | --- | --- | --- | --- | --- |
| clean | Single column, `$` prices | 0.0% | 1.00 / 1.00 | 100% | 1 / 1 / 100% |
| two-column | Side-by-side sections | 0.0% | 1.00 / 1.00 | 100% | 1 / 1 / 100% |
| odd-prices | Dot leaders, `€9,50`, `18 / 26`, `MP` | 2.0% | 1.00 / 1.00 | 100% | 1 / 1 / 100% |
| price-own-line | Name, description and price on separate lines | 0.0% | 1.00 / 1.00 | 100% | 1 / 1 / 100% |
| names-only | No descriptions | 0.0% | 1.00 / 1.00 | 100% | 1 / 1 / 100% |
| degraded | Blur, 2° tilt, low contrast, small type | 10.2% | 1.00 / 1.00 | **0%** | 1 / 1 / 100% |
| blank | No text (failed scan) | n/a | 0 items, no invented dishes | n/a | n/a |

The full output is in `tests/ocr/results.json`. Recognition takes about 0.2–0.8 s per image after the model loads.

### What changed the numbers
The first run, before the fixes below, scored: degraded CER 90.6% with 0 dishes found; two-column 0 dishes; clean, names-only and two-column all with 0% prices correct. Three fixes, each driven by inspecting raw Tesseract output:

1. **Upscale small images.** Small images are upscaled toward a 2000 px long side. Tesseract estimated about 186 DPI and dropped small glyphs like `$9`. This alone recovered the degraded menu's dishes.
2. **Split merged columns.** Tesseract merges side-by-side columns into one line. Lines are now split at wide word gaps, and a lone price stays with its dish.
3. **Re-attach right-aligned prices.** Tesseract returns right-aligned prices as a separate block. Each price-only line is now attached to the nearest text on the same row.

### Real menu photos
Five openly licensed photos from Wikimedia Commons (CC0 / CC BY-SA, not redistributed in the repo; fetch list in `tests/ocr/real/sources.json`) were run through the deployed scan UI (`node tests/ocr/real-run.ts`). There is no ground truth here, so this is a reading of the output, not a score.

| Photo | Before this round | After |
| --- | --- | --- |
| Printed tasting menu (Penarth) | 26 dishes with descriptions | Same; only tasting-menu lines carry prices, which matches the menu |
| Two-column bistro menu, tilted (Petit Pois) | Columns interleaved; several prices misread (`£350`) | Columns separated; 37/41 rows priced; 7 dropped decimals restored and flagged; dish/description split at the first comma |
| Thai set menu with bullets and smaller-set descriptions (Sawadee) | 4 dishes | All ~20 dish names correct, descriptions separated. Set menu, so no per-dish prices (correct) |
| Chalkboard, light on dark, partly hidden by flowers | Garbled | Still mostly garbled (handwriting + occlusion); auto-invert helps a little |
| Wide shot of a café counter, boards far away | 1 row | 1 row, plus a new hint to get closer so the menu fills the photo |

Changes behind the "after" column:
- deskew line boxes from Tesseract's baseline angle;
- a finer gutter detector (columns down to ~1.5% of the page apart);
- split lines right after a price;
- detect name→description where the type gets smaller;
- strip bullets, and allow a trailing note after a price ("(£22.45 per person)");
- restore dropped decimal points when the rest of the menu uses decimals;
- auto-invert dark images.

### Known limits
- On the degraded photo Tesseract doesn't read the blurred prices at all. The dishes are found and each is flagged "no price found" for the user to fix.
- Real photos with heavy perspective, handwriting, chalkboards or occlusion still need substantial correction in the review step.
- Only English is supported, and only English has been tested.

## Recommendation engine (`npm test`)
The engine has no training data, so evaluation is behavioural: tests assert properties a correct recommender must have.

- Different tastes produce different top dishes, and liked or disliked ingredients move scores in the right direction.
- Heat above tolerance is penalised, and more strongly when the menu states it.
- A 5★ rating lifts similar dishes on *other* menus. A 1★ lowers them. Three consistent ratings move a learned weight more than one (shrinkage). Saving is weaker than a 5★, and tried-but-unrated changes nothing.
- Cold-start users get five picks, led by a main course.
- Dishes with only a name never crash and are marked low-confidence and unverified.
- Across 40 randomised profiles and every sample dish, every score is in 0–100 and equals the squash of the exact sum of its listed reasons. No reason is zero-weight or empty.
- Dietary safety:
  - stated conflicts are held back;
  - "usually contains" is labelled as not stated;
  - no note anywhere says "safe", "allergen-free" or "guarantee";
  - vegetarians never get meat in their picks.
- Picks are diversified (no four ramens), deterministic, and list mains before desserts.

## Production checks (https://dishwise.bhanusadhu.com, 2026-10-29)
- **E2E against production** (`BASE_URL=https://dishwise.bhanusadhu.com npm run test:e2e`): 68 passed, 2 skipped (the signed-in test), across desktop Chrome and Pixel 7.
- **Accessibility:** axe WCAG 2.1 A/AA reports 0 violations on all 9 pages, the open dish sheet and the scan review. The first run found a label/name mismatch on the logo and low-contrast margin scores; both were fixed.
- **Lighthouse (mobile):** Accessibility 100, Best Practices 100, SEO 100. Before the fix, Best Practices was 96 because a guest's `/api/me` logged a 401.
- **Performance trace** (mobile, 4× CPU, Fast 4G, cold cache): LCP 643 ms (TTFB 21 ms), CLS 0.00.

## End-to-end (`npm run test:e2e`)
There are 35 scenarios (journeys, details, accessibility, security), each run on desktop Chrome and a Pixel 7 viewport. They cover:

- the home page with no sign-up;
- the guest taste card persisting across reloads and changing rankings;
- an allergy holding a dish back;
- rating re-ranking dishes and appearing in the notebook;
- typed menu → review → results;
- a **real photo upload with in-browser OCR** finding dishes and prices;
- rejecting a non-image file;
- keyboard use of the taste card;
- reduced motion;
- no horizontal scrolling on any page;
- unauthenticated API requests getting 401, with `no-store` on personal responses.

**Skipped:** the signed-in round-trip across two browser sessions. It needs a test account (`E2E_EMAIL`, `E2E_PASSWORD`), which only the owner should create. Server-side persistence and cross-user isolation are covered by integration tests against real Postgres (PGlite) running the shipped migrations.

## What to measure once real people use it
These are privacy-friendly aggregate counts, not tracking:

- time from landing to first marked-up menu;
- the share of OCR'd fields edited during review (correction rate);
- the share of picks opened, saved or rated;
- the average rating of dishes that were picks versus dishes that weren't (the real test of the ranking).

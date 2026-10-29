# Architecture

```
photo ──Tesseract.js (browser)──▶ OCR lines ──parse.ts──▶ candidates ──user review──▶ menu items
sample menu ───────────────────────────────────────────────────────────────────────────▶ menu items
typed dishes ──────────────────────────────────────────────────────────────────────────▶ menu items
menu items ──enrich.ts──▶ EnrichedDish[] ──rank.ts (profile + feedback)──▶ ranked / picks / held back
```

Everything left of the arrow into `rank.ts` runs in the browser. The server only persists profiles and feedback for signed-in users.

## Menu understanding (`src/lib/menu`)
- **`parse.ts`** turns OCR lines into candidate dishes. It detects price formats (dot leaders, `$12`, `€9,50`, `8 / 14`, `MP`), sections, descriptions, and two-column layouts. Columns are found by looking for an empty vertical gutter in a coverage histogram of line bounding boxes. Noise and boilerplate go to `ignored`, never into dishes.
- **`enrich.ts`** tags every attribute with its provenance:
  - `stated`: the words are on the menu (`"miso" in description`).
  - `inferred`: from a known dish archetype (`usually in Pad thai`) or derived from stated ingredients.
  - Missing means unknown. Nothing is guessed.
  - Handles negation (`no onions`), `X-free`, and plant-based substitutes (`vegan cheese` keeps the cheese flavour, drops dairy). When the menu names a protein, the archetype's usual protein is not inferred.

## Ranking (`src/lib/reco`)
A dish's **raw score** is the exact sum of additive, explainable **contributions**. Each one has points, user-facing text, a basis (`stated` / `inferred` / `you` / `menu`) and a `ref` to its evidence.

| Signal | Points (stated / inferred) |
| --- | --- |
| Dietary/allergy conflict | −60 / −35 (dish is also held back from picks) |
| Liked ingredient | +9 / +5.4, diminishing ×0.7 each, cap +22 |
| Disliked ingredient | −16 / −9, cap −40 |
| Liked cuisine (neighbour cuisine) | +10 / +6 (+4 / +2.4) |
| Favourite food (name / archetype) | +14 / +12 |
| Liked flavour, disliked flavour | +6 / +3.6 diminishing, cap +16; −9 / −5, cap −20 |
| Hotter than tolerance | −12 / −8 per level over |
| Budget (tertile of this menu's prices) | −7 … +6 |
| Learned taste from ratings | ±20 max (see below) |
| Most similar rated dish | 16 × (rating−3)/2 × cosine |
| Menu signals (cold start) | “house/signature” +5, main +3, side −4, drink −8, well described +2 |

**Score** = `100 / (1 + e^(−raw/18))`. It is a monotonic 0–100 *compatibility index*: raw 0 → 50, +18 → 73, +40 → 90. It is **not** a probability of enjoyment, and it has not been calibrated against real outcomes.

**Learning.** Each rating becomes c = (rating − 3) / 2 ∈ [−1, 1]. Saved-but-unrated dishes count as a half-weight 4★. For every feature f of the rated dish (ingredients, flavours, cuisine, archetype, heat bucket), the learned weight is `w_f = Σ c·x_f / (Σ x_f + 1.5)`. One 5★ rating moves a feature to +0.4, and three consistent ratings reach about +0.67. A candidate's history contribution is `22 × (unit dish vector · w)`, capped at ±20.

**Safety.** The user's diet exclusions and restrictions are matched against the dish's allergen groups:
- `conflict`: stated on the menu.
- `likely-conflict`: from a typical recipe.
- `labeled`: the menu labels the dish vegan/vegetarian, for diet-only users.
- `unverified`: otherwise, always with a "confirm with the restaurant" note.

The engine never says "safe" or "allergen-free". Tests enforce this.

**Diversity.** Picks are chosen with Maximal Marginal Relevance (λ = 0.72) over dish feature vectors, so the short-list isn't five near-identical ramens.

**Why no collaborative filtering.** It needs real interaction data from many users. A portfolio app won't have that, and synthetic users would be fake personalization.

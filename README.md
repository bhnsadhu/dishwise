# Dishwise

**What should I order here?** Dishwise learns what you like to eat, reads a restaurant menu (photo, sample, or typed), and ranks every dish for you — with the reasons behind each score and honest flags for anything it can't verify.

> Status: in active development. See [docs/PROGRESS.md](docs/PROGRESS.md).

## How it works
1. **Taste profile** — cuisines, favourite foods, liked/disliked ingredients and flavours, spice tolerance, diet, restrictions, budget. All optional.
2. **Menu** — scan a photo (Tesseract.js, in your browser — the photo never leaves your device), pick an illustrative sample, or type dishes.
3. **Enrichment** — each dish's ingredients, flavours, heat, course and cuisine are extracted from the menu text and tagged *stated*, or filled from typical recipes and tagged *inferred*. Nothing else is guessed.
4. **Ranking** — a deterministic, explainable scorer sums evidence-backed contributions, learns from your ratings, holds back dietary conflicts, and diversifies the short-list.

## Stack
Next.js (App Router) · React · TypeScript · Tailwind CSS · Neon Postgres + Drizzle · Tesseract.js · Vitest · Playwright — hosted on free tiers ($0).

## Development
```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # typecheck + lint + unit tests
```

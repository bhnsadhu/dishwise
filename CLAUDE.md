@AGENTS.md

# Dishwise — development instructions

Dishwise answers "What should I order at this restaurant?": taste profile → menu (sample, OCR scan, or manual) → explainable personalized dish ranking → ratings that change future rankings.

## Purpose & priorities
- Flagship **portfolio/resume project** for PM + SWE recruiting, not a commercial startup.
- Optimize for recruiting impact per unit of effort: visually impressive original UI, a genuinely working scanner + recommender, a seamless journey recruiters can try instantly (no sign-up required), technical depth to discuss in interviews, clean tested code.
- Avoid: overengineering, enterprise infra, features that only make the project look bigger, premature optimization, long research detours, excessive docs. Simplest reliable implementation wins.
- Build → Test → Commit → Push → Continue.

## Collaboration rules
- **The user owns visual design.** Don't lock in palette, typography, logo, homepage composition, navigation, card design, animation style, or major interaction patterns without their approval. Neutral scaffolding is fine; present 2–3 directions with working previews, recommend one, let them choose. Ask one design question at a time.
- Creative bar: Gauri Menon's portfolio (gaurimenon.com) — learn from its playful, physical, exploratory interaction philosophy; never copy its layout, code, graphics, wording or identity.
- Support keyboard, touch, and `prefers-reduced-motion`.
- Push back on suggestions when engineering or design judgment says so.

## Use existing free resources first
Before building complex functionality from scratch, check whether a reliable, maintained, legally reusable solution exists: installed Claude Code skills, available MCP connectors, public GitHub repos, official docs, open-source libraries/components, free dev tools. Prefer mature permissively-licensed implementations, proven algorithms, free OCR/image tools, quality UI/animation libraries, free testing/debugging tools, and properly licensed datasets/assets. Verify license, security, compatibility and free-tier limits before adopting. Don't install unnecessary tools, connect external accounts, or activate paid services without approval. Record reused code in `THIRD_PARTY_NOTICES.md`.

## Hard constraints
- **$0 infrastructure**: Vercel Hobby + Neon Free + browser-side Tesseract.js. No paid APIs (no OpenAI/Anthropic/paid OCR/maps). Never enable billing. Track in `COSTS.md`.
- PalateMap (no license) is concept-only — never copy its code. ML-Restaurant-Recommendations is MIT — ideas adapted with attribution.
- Never fabricate users, metrics, benchmarks, testimonials or awards. Never claim a dish is allergen-free or "safe"; unknown stays unknown.
- No raw menu photos uploaded/retained by default.

## Git workflow
- Commit + push verified chunks to `origin/main` frequently; Conventional Commits; no force-push, no history rewrites, no empty/padding commits.
- Author identity is repo-local: `bhnsadhu <206795055+bhnsadhu@users.noreply.github.com>` (verified noreply for GitHub user `bhnsadhu`). Don't touch global git config.
- Before each commit: review diff, stage intended files only, `npm run check` (typecheck + lint + unit tests), scan for secrets.
- Public deployment, DNS changes, paid services, destructive infra changes need explicit approval. As of setup, no Vercel project is linked to the repo, so pushes don't deploy.

## Code map
- `src/lib/domain/` — vocabulary (cuisines, flavors, allergen groups, diets), ingredient lexicon, dish archetypes, zod schemas (source of truth for profile/menu/feedback).
- `src/lib/menu/enrich.ts` — menu item → attributes, each tagged `stated` (on the menu) or `inferred` (typical recipe); missing = unknown.
- `src/lib/reco/` — `score.ts` (additive contributions → 0–100 via logistic squash; safety assessment), `learn.ts` (ratings → shrunk feature weights), `rank.ts` (ranking, held-back conflicts, MMR diversity).
- `src/lib/menu/samples.ts` — fictional illustrative menus; never pre-ranked.

## Commands
`npm run dev` · `npm run check` · `npm test` · `npm run build`

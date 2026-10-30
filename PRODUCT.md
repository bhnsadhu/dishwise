# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: a diner at a restaurant table, phone in hand, deciding what to order in the next minute or two, often in dim light, sometimes with others waiting. Secondary: the same person at home ordering online, pasting a menu. Recruiters evaluate the project by how real and fast it feels for that diner (confirmed by owner 2026-10-29).

## Product Purpose
Answer "What should I order here?" Dishwise reads the menu in front of you (photo, paste, or sample), ranks every dish against your taste, explains each ranking, and learns from what you rate. Success: a confident pick in under a minute, and trust in why.

## Positioning
Explainable, honest personal ranking of a specific menu: every reason points to the menu's own words or is labelled as a typical-recipe guess; nothing is invented; dietary conflicts are flagged and held back. Runs free and private: menu photos are read on the device and never uploaded.

## Operating Context
- Two first-class contexts (owner decision 2026-10-29): diners on phones at the table, and recruiters/reviewers on laptops, who must understand and try the product in seconds. The laptop view is designed in its own right (DoorDash-web-style), not a stretched phone layout.
- Used one-handed at a table; must be fast to scan and tap.
- Inputs: menu photo (camera or library), pasted text from sites and delivery apps, typed dishes, five fictional sample menus.
- Guests use everything; an account (Neon Auth, email + password) only syncs taste, ratings and saved dishes across devices.

## Capabilities and Constraints
- Taste profile: cuisines, favourite dishes, liked/disliked ingredients and flavours, heat tolerance, diet, things to avoid, budget. All optional.
- Ranking: deterministic 0–100 match with a point-by-point "why"; diversified top picks; held-back list for diet/allergy conflicts; learns from 1–5★ ratings and saves.
- Scan: in-browser OCR with an editable review step that flags uncertain reads.
- Notebook: saved, tried and rated dishes; ratings editable.
- $0 infrastructure (Vercel Hobby, Neon Free); no paid APIs.

## Brand Commitments
- Name: Dishwise. Wordmark and icon approved by the owner on 2026-10-30: "Dishwise" in Figtree beside a saffron tile with a solid bowl and a rising tick.
- Must not imitate DoorDash or any real brand's logo, colors or trade dress; the owner wants that level of consumer-app polish, not its identity.

## Evidence on Hand
- Five fictional sample menus in `src/lib/menu/samples.ts` (must stay labelled fictional).
- No food photography, no real restaurant data, no user reviews, no ratings from other people, no delivery, no prices beyond what a menu shows. None of these may be fabricated.

## Product Principles
1. Honesty over confidence: show what the menu says, label guesses, never claim a dish is safe.
2. A pick in under a minute: the answer comes first, the detail on demand.
3. The menu is the source: rankings are about this menu, not a catalogue of restaurants.
4. No sign-up wall: everything works as a guest.
5. Learn visibly: ratings change the next ranking, and the app says so.

## Accessibility & Inclusion
WCAG 2.1 AA (currently 0 axe violations; keep it). Keyboard and screen-reader complete, 44px touch targets, respects reduced motion. Allergy information must be unambiguous and never colour-only.

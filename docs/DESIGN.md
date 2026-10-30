# Design — "Saffron" (approved 2026-10-29)

Dishwise is designed to feel like a polished consumer food app, but with its own look: a white (or warm-black) background, saffron for the main action, and green for "good match". It answers first and puts the reasons one tap away. It must not imitate any real delivery app's logo, colours or styling.

This replaces direction C, "Marked-Up Menu", which used pen marks on a paper menu. That design was original but read as a concept piece rather than an app someone would use at a table.

## Tokens (`src/app/globals.css`)
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` / `card` | `#ffffff` / `#ffffff` | `#15130f` / `#201d17` | Page and cards |
| `ink` / `sub` | `#1c1913` / `#6a6355` | `#f5f0e6` / `#aaa497` | Text, secondary text |
| `line` / `surf` | `#ece5d6` / `#f7f2e8` | `#322d24` / `#29251e` | Hairlines; chips, secondary buttons |
| `brand` | `#f2a71b` | `#f6b53c` | Primary button, logo tile, focus ring |
| `brand-text` | `#8a5a00` | `#f6b53c` | Text links (saffron fails contrast as text on white) |
| `ok` / `ok-soft` | `#157a55` / `#e2f3eb` | `#6fd3a5` / `#173327` | Strong match, positive reasons |
| `no` / `no-soft` | `#c2352b` / `#fbe9e7` | `#ff8a7a` / `#3a1d19` | Held back, conflicts, negative reasons |
| `warn` / `warn-soft` | `#855800` / `#fff1d2` | `#f2c66b` / `#33290f` | Uncertain OCR reads, "confirm with staff" |
| `cv-*` | soft pastels | muted darks | Cover-art backgrounds, one per cuisine |

Dark mode follows the system until the user picks a theme in the top bar. The choice is saved in `localStorage` (`dw-theme`), and an inline script in `<head>` sets `data-theme` before first paint, so the page never flashes the wrong theme.

## Type
- **Figtree** (Google Fonts, `next/font`) for everything, weights 400–900.
- Display headings are 800–900 weight with tight tracking. Body text is 16 px with a line height of 1.45.
- **Wordmark** (approved 2026-10-30): "Dishwise" in Figtree 800 beside the mark, a saffron tile holding a solid bowl with a tick rising from it like steam. One SVG (`MarkSvg` in `icons.tsx`) drives the top bar, favicon, Apple touch icon and share image, so the mark reads at 16 px.

## Components
| Component | Rule |
| --- | --- |
| Match pill | `NN% match`. Green at 70+, neutral at 55–69, muted below 55. **"Held back"** in red replaces the number for diet or allergy conflicts. The pill never relies on colour alone. |
| Dish card | Name, description, price and up to two short reasons. The whole card is a tap target (a stretched title button), so its accessible name is short. |
| Dish dialog | A bottom sheet on phones and a centred dialog on laptops. Shows the score, rank on the menu, every reason with its points and source (*On menu*, *Typical recipe* in a dashed outline, *Your ratings*, *Menu*), then rating, Save and Mark tried. |
| Cover art | Flat SVG illustrations per cuisine (`cover-art.tsx`), drawn for this project. Dishwise has no food photos and never fakes them. |
| Taste editor | Chips cycle love → avoid → clear. Heat, diet and budget are radio groups. Allergies are checkboxes. |

## Layout
- **Phone:** a single column with a bottom tab bar (Home, Scan, Saved, You) and safe-area padding.
- **Laptop (768 px and up):** a sticky top bar holds the nav, the theme toggle and the Repository link. Results use three columns: section index, menu, and sticky top picks. This layout is designed for laptops, not stretched from the phone layout.
- The content width is capped at 1240 px with 16 px side gutters, and there is no horizontal scroll at any width.

## Motion
Motion is short and functional: buttons scale on press, the sheet slides up, a match pill pops when a rating changes the score, and content fades in. Nothing loops. Under `prefers-reduced-motion`, every animation and transition is cut to 1 ms.

## Accessibility
- Every control is a real `<button>`, `<a>` or `<input>` with a 2.5 px saffron focus ring.
- Touch targets are at least 44 px.
- Conflicts are spelled out in words ("Contains shellfish"), never shown by colour alone.
- The E2E suite runs axe (WCAG 2.1 A/AA) on every page in light mode and on seven pages in dark mode.

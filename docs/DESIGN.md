# Design — "Marked-Up Menu" (approved 2026-10-29)

Dishwise reads a menu the way a friend with a pen would. It circles what you'd love, underlines why, and crosses out what you can't have. You set your taste by marking up a card with the same pen, so input and output share one visual language.

## Tokens
| Token | Value | Use |
| --- | --- | --- |
| `table` / `table-2` | `#203d36` / `#1a332d` | Page ground: a bistro-green tablecloth (diagonal stripe) |
| `paper` | `#fbfbf7` | Cards: menu, taste card, notebook |
| `ink` | `#1e1d1a` | Printed text |
| `muted` | `#6b675e` | Descriptions, secondary print |
| `pen` | `#2347c5` | Every Dishwise annotation (ballpoint blue) |
| `red-pen` | `#c4362b` | Conflicts and dislikes only |
| `rule` | `#dedbd2` | Hairlines on paper |

Single look by design: the tablecloth is already dark and the paper stays paper, so there is no separate dark theme.

## Type
- **Gloock**: display; restaurant names and page titles.
- **Newsreader**: everything printed on the menu (names, descriptions, UI copy).
- **Gochi Hand**: Dishwise's pen. Annotations only (scores, notes, hints). Never body copy, never more than a line at a time.

## Annotation language
| Mark | Meaning |
| --- | --- |
| Pen circle around a name | One of your top picks (numbered in the margin) |
| Solid blue underline | Matches you, and the menu says so |
| Dotted underline | From a typical recipe, not stated on this menu |
| Wavy red underline | Something you dislike |
| Red strike-through | Conflicts with your diet or what you avoid |
| Margin number | 0–100 compatibility |

## Motion
Pen strokes draw on (~400–650 ms) once when they first appear or change. Nothing loops and nothing moves at rest. Under `prefers-reduced-motion`, strokes appear fully drawn.

## Interaction rules
- Taps only. No interaction requires dragging.
- Taste words cycle: tap once to circle (love), twice to strike (avoid), three times to clear.
- Every control is a real `<button>`/`<input>` with a visible dashed pen-blue focus ring.
- Touch targets are at least 40 px.

## Layout
- Paper cards sit on the tablecloth. On desktop the taste card sits beside the menu; on mobile everything is one column.
- The menu card mirrors a printed menu: centred section heads with hairlines, a margin column for scores, prices right-aligned in tabular figures.

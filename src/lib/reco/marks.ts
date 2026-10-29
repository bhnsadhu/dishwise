import { escapeRegex, normalize } from "@/lib/text";
import type { Contribution, ScoredDish } from "./score";

export type MarkKind = "pos" | "neg" | "bad";

export interface Segment {
  text: string;
  kind?: MarkKind;
}

export interface DishMarks {
  /** Words from the menu text to underline (pos), wavy-underline (neg) or strike (bad). */
  terms: { term: string; kind: MarkKind }[];
  /** Matches that come from typical recipes, not the menu text. Shown as dotted margin notes. */
  inferred: Contribution[];
}

const quoted = (because: string) => because.match(/^"(.+?)" (?:in|on)\b/)?.[1];

/** Translate a dish's scoring evidence into pen marks on its own menu text. */
export function dishMarks(r: ScoredDish): DishMarks {
  const terms: DishMarks["terms"] = [];
  const add = (term: string | undefined, kind: MarkKind) => {
    if (term && !terms.some((t) => t.term === term)) terms.push({ term, kind });
  };

  for (const c of r.contributions) {
    if (!c.ref || c.basis !== "stated") continue;
    const kind: MarkKind = c.points > 0 ? "pos" : "neg";
    if (c.ref.startsWith("ing:")) add(quoted(r.dish.ingredients.find((i) => `ing:${i.value}` === c.ref)?.because ?? ""), kind);
    else if (c.ref.startsWith("flv:")) add(quoted(r.dish.flavors.find((f) => `flv:${f.value}` === c.ref)?.because ?? ""), kind);
    else if (c.ref === "spice") add(quoted(r.dish.spice?.because ?? ""), kind);
  }
  for (const cf of r.safety.conflicts) if (cf.source === "stated") add(quoted(cf.because), "bad");
  // A struck word beats an underline on the same word.
  const bad = new Set(terms.filter((t) => t.kind === "bad").map((t) => t.term));
  return {
    terms: terms.filter((t) => t.kind === "bad" || !bad.has(t.term)),
    inferred: r.contributions.filter((c) => c.basis === "inferred" && (c.ref?.startsWith("ing:") || c.ref?.startsWith("group:"))),
  };
}

/**
 * Split original menu text into plain and marked segments. Matching is accent- and
 * case-insensitive (lexicon terms are normalized) while the output keeps the original characters.
 */
export function highlight(text: string, terms: DishMarks["terms"]): Segment[] {
  if (!text || terms.length === 0) return [{ text }];
  // Build a normalized copy with a map back to original indices.
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const n = normalize(text[i]);
    for (const ch of n) {
      norm += ch;
      map.push(i);
    }
  }
  map.push(text.length);

  const ranges: { start: number; end: number; kind: MarkKind }[] = [];
  for (const { term, kind } of [...terms].sort((a, b) => b.term.length - a.term.length)) {
    const body = escapeRegex(normalize(term)).replace(/\s+/g, "[\\s-]+");
    const re = new RegExp(`(?<![a-z0-9])${body}(?:e?s)?(?![a-z0-9])`, "g");
    for (const m of norm.matchAll(re)) {
      const start = map[m.index];
      const end = map[m.index + m[0].length - 1] + 1;
      if (ranges.some((r) => start < r.end && end > r.start)) continue;
      ranges.push({ start, end, kind });
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let at = 0;
  for (const r of ranges) {
    if (r.start > at) out.push({ text: text.slice(at, r.start) });
    out.push({ text: text.slice(r.start, r.end), kind: r.kind });
    at = r.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

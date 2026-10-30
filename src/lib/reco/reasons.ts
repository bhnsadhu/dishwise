import type { RankedDish, Recommendation } from "./rank";

/** Reasons that apply to nearly every dish on this menu (e.g. its cuisine) don't help you choose. */
export function commonReasons(rec: Recommendation): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rec.ranked) for (const t of new Set(r.contributions.map((c) => c.text))) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = rec.ranked.length;
  return new Set([...counts].filter(([, c]) => n >= 4 && c / n >= 0.8).map(([t]) => t));
}

/** The top distinguishing positive reasons for a dish; menu-position signals only if nothing else. */
export function topReasons(r: RankedDish, n = 2, skip: Set<string> = new Set()): { text: string; inferred: boolean }[] {
  const positive = r.contributions.filter((c) => c.points > 0 && !skip.has(c.text));
  const real = positive.filter((c) => c.kind !== "menu-signal");
  return (real.length ? real : positive).slice(0, n).map((c) => ({ text: c.text, inferred: c.basis === "inferred" }));
}

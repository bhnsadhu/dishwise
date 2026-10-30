import type { RankedDish } from "@/lib/reco/rank";

export const isHeld = (r: RankedDish) => r.safety.status === "conflict" || r.safety.status === "likely-conflict";

export const level = (r: RankedDish) => (isHeld(r) ? "held" : r.score >= 70 ? "high" : r.score >= 55 ? "mid" : "low");

export const formatPrice = (cents?: number, text?: string) => (cents !== undefined ? `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}` : (text ?? ""));

/** Score pill. "Held back" replaces the number when the dish conflicts with what you avoid. */
export function MatchPill({ r, long = false, pop = false }: { r: RankedDish; long?: boolean; pop?: boolean }) {
  const held = isHeld(r);
  return (
    <span className="match" data-level={level(r)} style={pop ? { animation: "pop .45s cubic-bezier(.2,1.6,.4,1)" } : undefined}>
      {held ? "Held back" : long ? `${r.score}% match` : `${r.score}%`}
    </span>
  );
}

export function heldReason(r: RankedDish): string {
  const g = r.safety.conflicts[0]?.group;
  if (!g) return "Check with staff";
  const label = g.replace("tree-nuts", "nuts").replace("-", " ");
  return r.safety.status === "conflict" ? `Contains ${label}` : `Usually has ${label}`;
}

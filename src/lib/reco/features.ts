import type { DishSnapshot } from "@/lib/domain/schemas";
import type { EnrichedDish } from "@/lib/menu/enrich";

/** Sparse feature vector: feature key → weight. */
export type Vec = Map<string, number>;

/**
 * Source-independent weights, so a dish and its own feedback snapshot have cosine similarity 1.
 * Provenance matters for *preference matching* (see score.ts), not for "is this the same kind of dish".
 */
const W = { ingredient: 1, flavor: 0.55, cuisine: 0.7, archetype: 1.2, heat: 0.4 } as const;

const heatBucket = (s: number) => (s >= 3 ? "hot" : s >= 1 ? "warm" : "none");

function build(parts: {
  ingredients: string[];
  flavors: string[];
  cuisine?: string;
  archetype?: string;
  spice?: number;
}): Vec {
  const v: Vec = new Map();
  for (const i of parts.ingredients) v.set(`ing:${i}`, W.ingredient);
  for (const f of parts.flavors) v.set(`flv:${f}`, W.flavor);
  if (parts.cuisine) v.set(`cui:${parts.cuisine}`, W.cuisine);
  if (parts.archetype) v.set(`arc:${parts.archetype}`, W.archetype);
  if (parts.spice !== undefined) v.set(`heat:${heatBucket(parts.spice)}`, W.heat);
  return v;
}

export function dishVector(d: EnrichedDish): Vec {
  return build({
    ingredients: d.ingredients.map((i) => i.value),
    flavors: d.flavors.map((f) => f.value),
    cuisine: d.cuisine?.value,
    archetype: d.archetype?.id,
    spice: d.spice?.value,
  });
}

export function snapshotVector(s: DishSnapshot): Vec {
  return build({
    ingredients: s.ingredients,
    flavors: s.flavors,
    cuisine: s.cuisine,
    archetype: s.archetype,
    spice: s.spice,
  });
}

export function toSnapshot(d: EnrichedDish, menuTitle?: string): DishSnapshot {
  return {
    name: d.name,
    cuisine: d.cuisine?.value,
    course: d.course?.value,
    archetype: d.archetype?.id,
    ingredients: d.ingredients.map((i) => i.value),
    flavors: d.flavors.map((f) => f.value),
    spice: d.spice?.value,
    priceCents: d.priceCents,
    menuTitle,
  };
}

export function norm(v: Vec): number {
  let s = 0;
  for (const x of v.values()) s += x * x;
  return Math.sqrt(s);
}

export function cosine(a: Vec, b: Vec): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  let dot = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, x] of small) {
    const y = large.get(k);
    if (y !== undefined) dot += x * y;
  }
  return dot / (na * nb);
}

export function describeFeature(key: string): { kind: string; id: string } {
  const [kind, id] = key.split(":", 2);
  return { kind, id };
}

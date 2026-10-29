import { matchArchetype, type EnrichedDish, type Source } from "@/lib/menu/enrich";
import { ingredientLabel } from "@/lib/domain/ingredients";
import type { TasteProfile } from "@/lib/domain/schemas";
import {
  CUISINE_NEIGHBOURS,
  cuisineLabel,
  dietExcludes,
  flavorLabel,
  groupLabel,
  type GroupId,
} from "@/lib/domain/vocab";
import { normalize, phraseRegex } from "@/lib/text";
import { cosine, describeFeature, dishVector, type Vec } from "./features";
import type { LearnedTaste } from "./learn";

export type ContributionKind =
  | "restriction"
  | "diet"
  | "cuisine"
  | "favorite"
  | "ingredient-like"
  | "ingredient-dislike"
  | "flavor-like"
  | "flavor-dislike"
  | "spice"
  | "budget"
  | "history"
  | "similar-rated"
  | "menu-signal";

/** One additive piece of evidence. `points` sum exactly to the dish's raw score. */
export interface Contribution {
  kind: ContributionKind;
  points: number;
  /** Short, user-facing sentence fragment. */
  text: string;
  /** Where the underlying dish attribute came from. "you" = from the user's own feedback. */
  basis: Source | "you" | "menu";
}

export type SafetyStatus =
  /** User declared no diet or restrictions. */
  | "not-applicable"
  /** Menu text states an ingredient the user avoids. */
  | "conflict"
  /** A typical recipe for this dish contains something the user avoids. */
  | "likely-conflict"
  /** Nothing conflicting is mentioned, but the menu doesn't list enough to know. */
  | "unverified"
  /** Menu explicitly labels the dish as fitting the user's diet. Still not an allergen guarantee. */
  | "labeled";

export interface Safety {
  status: SafetyStatus;
  conflicts: { group: GroupId; source: Source; via: string; because: string }[];
  /** User-facing caveats. Always present when the user has restrictions. */
  notes: string[];
}

export interface ScoredDish {
  dish: EnrichedDish;
  /** 0–100 compatibility index. Not a probability. */
  score: number;
  raw: number;
  contributions: Contribution[];
  safety: Safety;
  confidence: "high" | "medium" | "low";
  /** Uncertainties worth showing (missing price, unknown heat for a heat-averse user, …). */
  unknowns: string[];
}

export interface MenuContext {
  /** Price tertile cut points over the comparable (non-drink) items with known prices. */
  priceCuts: [number, number] | null;
}

/** Logistic squash. raw 0 → 50, ±18 → ~73/27, ±40 → ~90/10. Monotonic, so ranking == raw ranking. */
export const SCORE_SCALE = 18;
export const squash = (raw: number) => Math.round(100 / (1 + Math.exp(-raw / SCORE_SCALE)));

const round1 = (n: number) => Math.round(n * 10) / 10;
const byStrength = (s: Source) => (s === "stated" ? 1 : 0.6);

/** Sum a list of positive weights with geometric diminishing returns and a hard cap. */
function diminishing(values: number[], decay: number, cap: number): number[] {
  const sorted = [...values].sort((a, b) => Math.abs(b) - Math.abs(a));
  let total = 0;
  return sorted.map((v, i) => {
    let p = v * Math.pow(decay, i);
    if (Math.abs(total + p) > cap) p = Math.sign(p) * Math.max(0, cap - Math.abs(total));
    total += p;
    return p;
  });
}

const SIGNATURE_RE = /(?<![a-z])(house|signature|chef'?s|famous|specialty|speciality|our classic|award[\s-]winning)(?![a-z])/;

export function menuContext(dishes: EnrichedDish[]): MenuContext {
  const prices = dishes
    .filter((d) => d.priceCents !== undefined && d.course?.value !== "drink")
    .map((d) => d.priceCents!)
    .sort((a, b) => a - b);
  if (prices.length < 3) return { priceCuts: null };
  const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor(p * prices.length))];
  return { priceCuts: [q(1 / 3), q(2 / 3)] };
}

function priceTier(cents: number, cuts: [number, number]): "low" | "mid" | "high" {
  if (cents < cuts[0]) return "low";
  if (cents < cuts[1]) return "mid";
  return "high";
}

export function assessSafety(dish: EnrichedDish, profile: TasteProfile): Safety {
  const avoid = new Map<GroupId, "restriction" | "diet">();
  for (const g of dietExcludes(profile.diet)) avoid.set(g, "diet");
  for (const g of profile.restrictions) avoid.set(g, "restriction");
  if (avoid.size === 0) return { status: "not-applicable", conflicts: [], notes: [] };

  const conflicts = dish.groups
    .filter((g) => avoid.has(g.value))
    .map((g) => ({ group: g.value, source: g.source, via: g.via, because: g.because }));
  const notes: string[] = [];
  const hasAllergy = profile.restrictions.length > 0;
  const confirm = hasAllergy
    ? "If you have an allergy, confirm ingredients and cross-contact with the restaurant."
    : "Confirm with the restaurant if it matters.";

  if (conflicts.some((c) => c.source === "stated")) {
    const c = conflicts.filter((x) => x.source === "stated");
    notes.push(`Menu lists ${c.map((x) => `${ingredientLabel(x.via).toLowerCase()} (${groupLabel(x.group).toLowerCase()})`).join(", ")}.`);
    return { status: "conflict", conflicts, notes };
  }
  if (conflicts.length > 0) {
    notes.push(
      `${dish.archetype?.label ?? "This dish"} usually contains ${[...new Set(conflicts.map((c) => groupLabel(c.group).toLowerCase()))].join(", ")} — not stated on this menu. ${confirm}`,
    );
    return { status: "likely-conflict", conflicts, notes };
  }

  const dietLabelOk =
    (profile.diet === "vegan" && dish.labels.includes("vegan")) ||
    (profile.diet === "vegetarian" && (dish.labels.includes("vegetarian") || dish.labels.includes("vegan")));
  if (dietLabelOk && !hasAllergy) {
    notes.push(`Labeled ${profile.diet} on the menu.`);
    return { status: "labeled", conflicts, notes };
  }

  const names = [...avoid.keys()].map((g) => groupLabel(g).toLowerCase());
  notes.push(
    dish.description
      ? `No ${names.join(", ")} mentioned, but menus rarely list everything. ${confirm}`
      : `No description on the menu, so ingredients are unknown. ${confirm}`,
  );
  return { status: "unverified", conflicts, notes };
}

export function scoreDish(
  dish: EnrichedDish,
  profile: TasteProfile,
  learned: LearnedTaste,
  ctx: MenuContext,
  vec: Vec = dishVector(dish),
): ScoredDish {
  const out: Contribution[] = [];
  const unknowns: string[] = [];
  const push = (c: Contribution) => {
    const points = round1(c.points);
    if (points !== 0) out.push({ ...c, points });
  };

  // --- Safety (hard constraints dominate everything else) -----------------------------------
  const safety = assessSafety(dish, profile);
  if (safety.status === "conflict" || safety.status === "likely-conflict") {
    const stated = safety.status === "conflict";
    const isAllergy = safety.conflicts.some((c) => profile.restrictions.includes(c.group));
    const groups = [...new Set(safety.conflicts.map((c) => groupLabel(c.group).toLowerCase()))].join(", ");
    push({
      kind: isAllergy ? "restriction" : "diet",
      points: stated ? -60 : -35,
      text: stated ? `Lists ${groups}, which you avoid` : `Usually contains ${groups}, which you avoid`,
      basis: stated ? "stated" : "inferred",
    });
  } else if (safety.status === "labeled") {
    push({ kind: "diet", points: 6, text: safety.notes[0].replace(/\.$/, ""), basis: "stated" });
  }

  // --- Cuisine -------------------------------------------------------------------------------
  if (dish.cuisine && profile.cuisines.length > 0) {
    const c = dish.cuisine.value;
    const f = byStrength(dish.cuisine.source);
    if (profile.cuisines.includes(c)) {
      push({ kind: "cuisine", points: 10 * f, text: `${cuisineLabel(c)}, a cuisine you love`, basis: dish.cuisine.source });
    } else {
      const near = profile.cuisines.find((u) => CUISINE_NEIGHBOURS[u]?.includes(c));
      if (near) push({ kind: "cuisine", points: 4 * f, text: `${cuisineLabel(c)} — close to ${cuisineLabel(near)}, which you like`, basis: dish.cuisine.source });
    }
  }

  // --- Favourite foods -----------------------------------------------------------------------
  if (profile.favoriteFoods.length > 0) {
    const nameN = normalize(dish.name);
    for (const fav of profile.favoriteFoods) {
      const favN = normalize(fav);
      if (phraseRegex(favN, "").test(nameN)) {
        push({ kind: "favorite", points: 14, text: `It's ${fav.toLowerCase()} — one of your favourites`, basis: "stated" });
        break;
      }
      const favArch = matchArchetype(fav);
      if (favArch && dish.archetype?.id === favArch.id) {
        push({ kind: "favorite", points: 12, text: `A take on ${favArch.label.toLowerCase()}, one of your favourites`, basis: "inferred" });
        break;
      }
    }
  }

  // --- Ingredients ---------------------------------------------------------------------------
  const liked = dish.ingredients
    .filter((i) => profile.likedIngredients.includes(i.value))
    .sort((a, b) => byStrength(b.source) - byStrength(a.source));
  diminishing(liked.map((i) => 9 * byStrength(i.source)), 0.7, 22).forEach((p, idx) => {
    const ing = liked[idx];
    push({
      kind: "ingredient-like",
      points: p,
      text: ing.source === "stated" ? `Has ${ingredientLabel(ing.value).toLowerCase()}` : `Usually has ${ingredientLabel(ing.value).toLowerCase()}`,
      basis: ing.source,
    });
  });

  const disliked = dish.ingredients.filter((i) => profile.dislikedIngredients.includes(i.value));
  let dislikeTotal = 0;
  for (const ing of disliked) {
    const p = Math.max(-40 - dislikeTotal, ing.source === "stated" ? -16 : -9);
    dislikeTotal += p;
    push({
      kind: "ingredient-dislike",
      points: p,
      text: ing.source === "stated" ? `Contains ${ingredientLabel(ing.value).toLowerCase()}, which you dislike` : `May contain ${ingredientLabel(ing.value).toLowerCase()}, which you dislike`,
      basis: ing.source,
    });
  }

  // --- Flavours ------------------------------------------------------------------------------
  const likedF = dish.flavors
    .filter((f) => profile.likedFlavors.includes(f.value))
    .sort((a, b) => byStrength(b.source) - byStrength(a.source));
  diminishing(likedF.map((f) => 6 * byStrength(f.source)), 0.75, 16).forEach((p, idx) => {
    const f = likedF[idx];
    push({ kind: "flavor-like", points: p, text: `${flavorLabel(f.value)}, a flavour you enjoy`, basis: f.source });
  });
  let dislikeF = 0;
  for (const f of dish.flavors.filter((x) => profile.dislikedFlavors.includes(x.value))) {
    const p = Math.max(-20 - dislikeF, f.source === "stated" ? -9 : -5);
    dislikeF += p;
    push({ kind: "flavor-dislike", points: p, text: `${flavorLabel(f.value)}, which you'd rather avoid`, basis: f.source });
  }

  // --- Spice ---------------------------------------------------------------------------------
  const t = profile.spiceTolerance;
  if (t !== null) {
    if (dish.spice) {
      const s = dish.spice.value;
      if (s > t) {
        push({
          kind: "spice",
          points: -(s - t) * (dish.spice.source === "stated" ? 12 : 8),
          text: dish.spice.source === "stated" ? "Hotter than you like" : "Probably hotter than you like",
          basis: dish.spice.source,
        });
      } else if (t >= 3 && s >= 2) {
        push({ kind: "spice", points: dish.spice.source === "stated" ? 6 : 4, text: "Brings the heat you enjoy", basis: dish.spice.source });
      }
    } else if (t <= 1) {
      unknowns.push("Heat level isn't listed");
    }
  }

  // --- Budget --------------------------------------------------------------------------------
  if (profile.budget !== "any") {
    if (dish.priceCents === undefined || !ctx.priceCuts) {
      if (dish.priceCents === undefined) unknowns.push("No price listed");
    } else {
      const tier = priceTier(dish.priceCents, ctx.priceCuts);
      const table = {
        value: { low: 6, mid: 1, high: -7 },
        moderate: { low: 1, mid: 4, high: -3 },
        splurge: { low: 0, mid: 1, high: 5 },
      } as const;
      const p = table[profile.budget][tier];
      const label = { low: "One of the lower-priced dishes here", mid: "Mid-priced for this menu", high: "Among the pricier dishes here" }[tier];
      push({ kind: "budget", points: p, text: label, basis: "menu" });
    }
  }

  // --- Learned taste (from ratings) ----------------------------------------------------------
  if (learned.weights.size > 0) {
    let dot = 0;
    const terms: { key: string; v: number }[] = [];
    let n2 = 0;
    for (const x of vec.values()) n2 += x * x;
    const n = Math.sqrt(n2) || 1;
    for (const [k, x] of vec) {
      const w = learned.weights.get(k);
      if (w === undefined) continue;
      const v = (x / n) * w;
      dot += v;
      terms.push({ key: k, v });
    }
    const points = Math.max(-25, Math.min(25, 30 * dot));
    if (Math.abs(points) >= 1) {
      terms.sort((a, b) => (points > 0 ? b.v - a.v : a.v - b.v));
      const drivers = terms
        .filter((x) => Math.sign(x.v) === Math.sign(points))
        .slice(0, 2)
        .map((x) => featureLabel(x.key));
      push({
        kind: "history",
        points,
        text: points > 0 ? `You've rated dishes with ${drivers.join(" & ")} highly` : `You've rated dishes with ${drivers.join(" & ")} poorly`,
        basis: "you",
      });
    }
  }

  // Nearest rated dish
  let best: { name: string; rating: number; sim: number; centered: number; implicit: boolean } | null = null;
  for (const ex of learned.examples) {
    if (ex.centered === 0) continue;
    const sim = cosine(vec, ex.vec);
    if (sim >= 0.55 && (!best || sim * Math.abs(ex.centered) > best.sim * Math.abs(best.centered))) {
      best = { name: ex.name, rating: ex.rating, sim, centered: ex.centered, implicit: ex.implicit };
    }
  }
  if (best) {
    const same = best.sim > 0.98 && normalize(best.name) === normalize(dish.name);
    push({
      kind: "similar-rated",
      points: 16 * best.centered * best.sim * (best.implicit ? 0.5 : 1),
      text: same
        ? best.implicit
          ? "You saved this dish before"
          : `You rated this ${best.rating}★ before`
        : best.implicit
          ? `Similar to ${best.name}, which you saved`
          : `Similar to ${best.name}, which you rated ${best.rating}★`,
      basis: "you",
    });
  }

  // --- Menu-intrinsic signals (cold-start tie breakers; small on purpose) ---------------------
  const allN = normalize(`${dish.name} ${dish.description ?? ""}`);
  const sig = allN.match(SIGNATURE_RE);
  if (sig) push({ kind: "menu-signal", points: 5, text: `The menu calls it "${sig[1]}"`, basis: "menu" });
  const course = dish.course?.value;
  if (course === "main") push({ kind: "menu-signal", points: 3, text: "A main course", basis: dish.course!.source });
  else if (course === "side") push({ kind: "menu-signal", points: -4, text: "A side, not a meal on its own", basis: dish.course!.source });
  else if (course === "drink") push({ kind: "menu-signal", points: -8, text: "A drink", basis: dish.course!.source });
  if (dish.completeness >= 0.6 && dish.description) push({ kind: "menu-signal", points: 2, text: "Well described on the menu", basis: "menu" });
  if (!dish.description) unknowns.push("No description on the menu");

  const raw = round1(out.reduce((a, c) => a + c.points, 0));

  const magnitude = out.reduce((a, c) => a + Math.abs(c.points), 0);
  const stated = out.filter((c) => c.basis !== "inferred").reduce((a, c) => a + Math.abs(c.points), 0);
  const statedShare = magnitude === 0 ? 0 : stated / magnitude;
  const confidence =
    dish.completeness >= 0.6 && statedShare >= 0.5 ? "high" : dish.completeness >= 0.35 || statedShare >= 0.5 ? "medium" : "low";

  return { dish, score: squash(raw), raw, contributions: out.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)), safety, confidence, unknowns };
}

function featureLabel(key: string): string {
  const { kind, id } = describeFeature(key);
  switch (kind) {
    case "ing":
      return ingredientLabel(id).toLowerCase();
    case "flv":
      return `${flavorLabel(id as never).toLowerCase()} flavours`;
    case "cui":
      return `${cuisineLabel(id as never)} food`;
    case "arc":
      return id.replace(/-/g, " ");
    case "heat":
      return id === "hot" ? "real heat" : id === "warm" ? "some heat" : "no heat";
    default:
      return id;
  }
}

import type { Feedback, TasteProfile } from "@/lib/domain/schemas";
import type { EnrichedDish } from "@/lib/menu/enrich";
import { cosine, dishVector, type Vec } from "./features";
import { learnFromFeedback, type LearnedTaste } from "./learn";
import { menuContext, scoreDish, type ScoredDish } from "./score";

export interface RankedDish extends ScoredDish {
  /** 1-based position by score among all dishes. */
  rank: number;
}

export interface Recommendation {
  /** Every dish, best first. Conflicting dishes sink to the bottom by score. */
  ranked: RankedDish[];
  /** Diversified short-list: no conflicts, no drinks, re-ranked with MMR. */
  picks: RankedDish[];
  /** Dishes held back because of a stated or likely dietary conflict. */
  heldBack: RankedDish[];
  stage: "cold-start" | "profile" | "learning";
  learned: LearnedTaste;
}

export interface RankOptions {
  picks?: number;
  /** MMR trade-off: 1 = pure score, 0 = pure novelty. */
  lambda?: number;
}

export function profileSignal(p: TasteProfile): number {
  return (
    p.cuisines.length +
    p.favoriteFoods.length +
    p.likedIngredients.length +
    p.dislikedIngredients.length +
    p.likedFlavors.length +
    p.dislikedFlavors.length +
    (p.spiceTolerance !== null ? 1 : 0) +
    (p.diet !== "none" ? 1 : 0) +
    p.restrictions.length +
    (p.budget !== "any" ? 1 : 0)
  );
}

/**
 * Maximal Marginal Relevance: repeatedly take the dish maximising
 *   λ · relevance − (1 − λ) · max similarity to anything already picked.
 * Relevance is the 0–100 score rescaled to 0–1 so both terms share a scale.
 */
export function diversify(items: RankedDish[], vecs: Map<string, Vec>, k: number, lambda: number): RankedDish[] {
  const pool = [...items];
  const chosen: RankedDish[] = [];
  while (chosen.length < k && pool.length > 0) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((cand, i) => {
      const v = vecs.get(cand.dish.key)!;
      const maxSim = chosen.length === 0 ? 0 : Math.max(...chosen.map((c) => cosine(v, vecs.get(c.dish.key)!)));
      const val = lambda * (cand.score / 100) - (1 - lambda) * maxSim;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    });
    chosen.push(pool.splice(bestIdx, 1)[0]);
  }
  return chosen;
}

export function recommend(
  dishes: EnrichedDish[],
  profile: TasteProfile,
  feedback: Feedback[] = [],
  opts: RankOptions = {},
): Recommendation {
  const learned = learnFromFeedback(feedback);
  const ctx = menuContext(dishes);
  const vecs = new Map(dishes.map((d) => [d.key, dishVector(d)]));

  const scored = dishes.map((d) => scoreDish(d, profile, learned, ctx, vecs.get(d.key)));
  // Stable tie-break by menu order keeps results deterministic.
  const order = new Map(dishes.map((d, i) => [d.key, i]));
  scored.sort((a, b) => b.raw - a.raw || order.get(a.dish.key)! - order.get(b.dish.key)!);
  const ranked: RankedDish[] = scored.map((s, i) => ({ ...s, rank: i + 1 }));

  const heldBack = ranked.filter((r) => r.safety.status === "conflict" || r.safety.status === "likely-conflict");
  const eligible = ranked.filter((r) => !heldBack.includes(r));
  const food = eligible.filter((r) => r.dish.course?.value !== "drink");
  const picks = diversify(food.length > 0 ? food : eligible, vecs, opts.picks ?? 5, opts.lambda ?? 0.72);

  const stage = learned.examples.length > 0 ? "learning" : profileSignal(profile) > 0 ? "profile" : "cold-start";
  return { ranked, picks, heldBack, stage, learned };
}

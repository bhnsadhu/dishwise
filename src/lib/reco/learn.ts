import type { DishSnapshot, Feedback } from "@/lib/domain/schemas";
import { snapshotVector, type Vec } from "./features";

/** Rating used for a dish that was saved but never rated: a mild positive signal. */
export const IMPLICIT_SAVE_RATING = 4;
/**
 * Bayesian-style shrinkage. With K = 1.5 a single 5★ rating moves a feature to +0.4, three
 * consistent ratings reach ~+0.67, and the weight approaches ±1 only with sustained evidence.
 */
export const SHRINKAGE_K = 1.5;

export interface RatedExample {
  dishKey: string;
  name: string;
  rating: number;
  /** (rating − 3) / 2 → −1 … +1 */
  centered: number;
  implicit: boolean;
  vec: Vec;
  snapshot: DishSnapshot;
}

export interface LearnedTaste {
  /** Feature key → learned preference in (−1, 1). */
  weights: Map<string, number>;
  /** Feature key → number of rated dishes that contained it (for explanations). */
  support: Map<string, number>;
  examples: RatedExample[];
}

export function effectiveRating(f: Feedback): { rating: number; implicit: boolean } | null {
  if (f.rating !== null) return { rating: f.rating, implicit: false };
  if (f.saved) return { rating: IMPLICIT_SAVE_RATING, implicit: true };
  return null;
}

export function learnFromFeedback(feedback: Feedback[]): LearnedTaste {
  const acc = new Map<string, number>();
  const mass = new Map<string, number>();
  const support = new Map<string, number>();
  const examples: RatedExample[] = [];

  for (const f of feedback) {
    const eff = effectiveRating(f);
    if (!eff) continue;
    const centered = (eff.rating - 3) / 2;
    const vec = snapshotVector(f.snapshot);
    examples.push({
      dishKey: f.dishKey,
      name: f.snapshot.name,
      rating: eff.rating,
      centered,
      implicit: eff.implicit,
      vec,
      snapshot: f.snapshot,
    });
    // Implicit saves count half as much as explicit ratings.
    const strength = eff.implicit ? 0.5 : 1;
    for (const [k, x] of vec) {
      acc.set(k, (acc.get(k) ?? 0) + centered * x * strength);
      mass.set(k, (mass.get(k) ?? 0) + x * strength);
      support.set(k, (support.get(k) ?? 0) + 1);
    }
  }

  const weights = new Map<string, number>();
  for (const [k, a] of acc) {
    const w = a / ((mass.get(k) ?? 0) + SHRINKAGE_K);
    if (Math.abs(w) > 1e-6) weights.set(k, w);
  }
  return { weights, support, examples };
}

export const emptyLearned = (): LearnedTaste => ({ weights: new Map(), support: new Map(), examples: [] });

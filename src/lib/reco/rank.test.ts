import { describe, expect, it } from "vitest";
import { emptyProfile, type Feedback, type TasteProfile } from "@/lib/domain/schemas";
import { enrichDish, enrichMenu, type EnrichedDish } from "@/lib/menu/enrich";
import { SAMPLE_MENUS, sampleMenuById } from "@/lib/menu/samples";
import { toSnapshot } from "./features";
import { learnFromFeedback, SHRINKAGE_K } from "./learn";
import { recommend } from "./rank";
import { squash } from "./score";

const profile = (p: Partial<TasteProfile> = {}): TasteProfile => ({ ...emptyProfile(), ...p });
const menu = (id: string) => {
  const m = sampleMenuById(id)!;
  return enrichMenu(m.items, { menuKey: m.id, menuCuisine: m.cuisine });
};
const byName = (r: ReturnType<typeof recommend>, name: string) => r.ranked.find((d) => d.dish.name === name)!;
const rate = (d: EnrichedDish, rating: number | null, extra: Partial<Feedback> = {}): Feedback => ({
  dishKey: d.key,
  snapshot: toSnapshot(d),
  saved: false,
  tried: true,
  rating,
  ...extra,
});

describe("recommend — personalization", () => {
  it("different tastes produce different rankings", () => {
    const dishes = menu("nonna-fig");
    const heat = recommend(dishes, profile({ spiceTolerance: 4, likedFlavors: ["smoky"], likedIngredients: ["chili"] }));
    const mild = recommend(dishes, profile({ spiceTolerance: 0, likedIngredients: ["mushroom", "cream"], likedFlavors: ["creamy"] }));
    expect(heat.ranked[0].dish.name).not.toBe(mild.ranked[0].dish.name);
    expect(byName(heat, "Rigatoni all'Arrabbiata").score).toBeGreaterThan(byName(mild, "Rigatoni all'Arrabbiata").score);
    expect(byName(mild, "Wild Mushroom Pappardelle").score).toBeGreaterThan(byName(heat, "Wild Mushroom Pappardelle").score);
  });

  it("liked ingredients raise a dish's score", () => {
    const dishes = menu("lantern-noodle-bar");
    const base = byName(recommend(dishes, profile()), "Salmon Teriyaki Don").score;
    const withSalmon = byName(recommend(dishes, profile({ likedIngredients: ["salmon"] })), "Salmon Teriyaki Don").score;
    expect(withSalmon).toBeGreaterThan(base);
  });

  it("disliked ingredients lower a dish's score", () => {
    const dishes = menu("casa-comal");
    const base = byName(recommend(dishes, profile()), "Guacamole & Chips").score;
    const noCilantro = byName(recommend(dishes, profile({ dislikedIngredients: ["cilantro"] })), "Guacamole & Chips").score;
    expect(noCilantro).toBeLessThan(base);
  });

  it("penalises dishes hotter than the user's tolerance, more when heat is stated", () => {
    const dishes = menu("saffron-steps");
    const r = recommend(dishes, profile({ spiceTolerance: 1 }));
    const vindaloo = byName(r, "Lamb Vindaloo");
    expect(vindaloo.contributions.find((c) => c.kind === "spice")?.points).toBeLessThan(-30);
    expect(byName(r, "Butter Chicken").contributions.some((c) => c.kind === "spice")).toBe(false);
  });

  it("favourite foods match by name and by archetype", () => {
    const dishes = menu("lantern-noodle-bar");
    const r = recommend(dishes, profile({ favoriteFoods: ["ramen"] }));
    expect(r.picks[0].dish.name).toMatch(/Ramen/);
  });

  it("budget preference is relative to the menu's own prices", () => {
    const dishes = menu("nonna-fig");
    const value = recommend(dishes, profile({ budget: "value" }));
    expect(byName(value, "Lobster Linguine").contributions.find((c) => c.kind === "budget")?.points).toBeLessThan(0);
    expect(byName(value, "Margherita").contributions.find((c) => c.kind === "budget")?.points).toBeGreaterThan(0);
  });
});

describe("recommend — feedback learning", () => {
  it("a 5★ rating lifts similar dishes on a different menu", () => {
    const ramen = menu("lantern-noodle-bar").find((d) => d.name === "Spicy Miso Ramen")!;
    const target = menu("lantern-noodle-bar");
    const before = byName(recommend(target, profile()), "House Tonkotsu Ramen");
    const after = byName(recommend(target, profile(), [rate(ramen, 5)]), "House Tonkotsu Ramen");
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.contributions.some((c) => c.kind === "similar-rated" && c.text.includes("Spicy Miso Ramen"))).toBe(true);
  });

  it("a 1★ rating pushes similar dishes down", () => {
    const dishes = menu("saffron-steps");
    const korma = enrichDish({ name: "Butter Chicken", description: "Creamy tomato butter sauce, chicken" });
    const before = byName(recommend(dishes, profile()), "Butter Chicken").score;
    const after = byName(recommend(dishes, profile(), [rate(korma, 1)]), "Butter Chicken").score;
    expect(after).toBeLessThan(before);
  });

  it("more consistent ratings move learned weights further (shrinkage)", () => {
    const fish = enrichDish({ name: "Fish Tacos", description: "Battered cod, slaw, lime" });
    const once = learnFromFeedback([rate(fish, 5)]).weights.get("ing:white-fish")!;
    const thrice = learnFromFeedback([rate(fish, 5), rate({ ...fish, key: "b" }, 5), rate({ ...fish, key: "c" }, 5)]).weights.get("ing:white-fish")!;
    expect(once).toBeCloseTo(1 / (1 + SHRINKAGE_K), 5);
    expect(thrice).toBeGreaterThan(once);
    expect(thrice).toBeLessThan(1);
  });

  it("saving without rating is a weaker positive signal than a 5★", () => {
    const dishes = menu("little-mezze");
    const f = dishes.find((d) => d.name === "Falafel")!;
    const saved = byName(recommend(dishes, profile(), [rate(f, null, { saved: true, tried: false })]), "Hummus").score;
    const rated = byName(recommend(dishes, profile(), [rate(f, 5)]), "Hummus").score;
    const none = byName(recommend(dishes, profile()), "Hummus").score;
    expect(saved).toBeGreaterThan(none);
    expect(rated).toBeGreaterThan(saved);
  });

  it("tried-but-unrated dishes don't change anything", () => {
    const dishes = menu("little-mezze");
    const f = dishes.find((d) => d.name === "Falafel")!;
    const a = recommend(dishes, profile()).ranked.map((d) => d.score);
    const b = recommend(dishes, profile(), [rate(f, null)]).ranked.map((d) => d.score);
    expect(b).toEqual(a);
  });
});

describe("recommend — cold start, missing data, explanations", () => {
  it("returns useful picks for a brand-new user", () => {
    const r = recommend(menu("nonna-fig"), profile());
    expect(r.stage).toBe("cold-start");
    expect(r.picks).toHaveLength(5);
    // Cold start prefers mains and signature dishes over sides and desserts
    expect(r.picks[0].dish.course?.value).toBe("main");
  });

  it("treats 'house' as a signature only in the dish name, not 'house-made' in a description", () => {
    const r = recommend(enrichMenu([{ name: "House Burger" }, { name: "Paneer Curry", description: "house paneer, spinach" }, { name: "Stew", description: "our signature braise" }]), profile());
    const sig = (name: string) => byName(r, name).contributions.some((c) => c.kind === "menu-signal" && c.text.startsWith("The menu calls it"));
    expect(sig("House Burger")).toBe(true);
    expect(sig("Paneer Curry")).toBe(false);
    expect(sig("Stew")).toBe(true);
  });

  it("handles dishes with nothing but a name", () => {
    const dishes = enrichMenu([{ name: "Mystery Plate" }, { name: "?" }, { name: "Soup of the Day", priceText: "MP" }]);
    const r = recommend(dishes, profile({ restrictions: ["peanuts"], spiceTolerance: 0, budget: "value" }));
    expect(r.ranked).toHaveLength(3);
    for (const d of r.ranked) {
      expect(d.safety.status).toBe("unverified");
      expect(d.confidence).toBe("low");
    }
  });

  it("scores stay in 0–100 and equal squash(sum of contributions) for every profile tried", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = <T,>(xs: readonly T[], n: number) => xs.filter(() => rnd() < n / xs.length);
    const all = SAMPLE_MENUS.flatMap((m) => enrichMenu(m.items, { menuKey: m.id, menuCuisine: m.cuisine }));
    for (let i = 0; i < 40; i++) {
      const p = profile({
        cuisines: pick(["italian", "japanese", "indian", "mexican", "middle-eastern"] as const, 2),
        likedIngredients: pick(["chili", "cheese", "pork", "tofu", "mushroom", "salmon", "garlic"], 3),
        dislikedIngredients: pick(["cilantro", "olives", "egg", "onion"], 1),
        likedFlavors: pick(["smoky", "creamy", "tangy", "crispy", "sweet"] as const, 2),
        spiceTolerance: Math.floor(rnd() * 5) as 0 | 1 | 2 | 3 | 4,
        budget: (["any", "value", "moderate", "splurge"] as const)[Math.floor(rnd() * 4)],
        restrictions: pick(["peanuts", "dairy", "gluten", "shellfish"] as const, 1),
      });
      const feedback = pick(all, 3).map((d) => rate(d, 1 + Math.floor(rnd() * 5)));
      const r = recommend(all, p, feedback);
      for (const d of r.ranked) {
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(100);
        const sum = Math.round(d.contributions.reduce((a, c) => a + c.points, 0) * 10) / 10;
        expect(sum).toBeCloseTo(d.raw, 5);
        expect(d.score).toBe(squash(d.raw));
        for (const c of d.contributions) {
          expect(c.points).not.toBe(0);
          expect(c.text.length).toBeGreaterThan(3);
        }
      }
    }
  });

  it("explanations reference the actual evidence", () => {
    const r = recommend(menu("lantern-noodle-bar"), profile({ likedIngredients: ["salmon"] }));
    const don = byName(r, "Salmon Teriyaki Don");
    const like = don.contributions.find((c) => c.kind === "ingredient-like")!;
    expect(like.text).toBe("Has salmon");
    expect(like.basis).toBe("stated");
    expect(like.ref).toBe("ing:salmon");
  });

  it("diversifies picks rather than showing near-duplicates", () => {
    const r = recommend(menu("lantern-noodle-bar"), profile({ favoriteFoods: ["ramen"], cuisines: ["japanese"] }));
    const ramens = r.picks.filter((p) => /ramen/i.test(p.dish.name)).length;
    expect(ramens).toBeLessThan(4);
    expect(r.picks.length).toBe(5);
  });

  it("lists desserts and sides after the meal in picks", () => {
    const r = recommend(menu("lantern-noodle-bar"), profile({ likedIngredients: ["cream", "sesame"], likedFlavors: ["sweet", "creamy"] }));
    const order = r.picks.map((p) => p.dish.course?.value);
    const firstDessert = order.indexOf("dessert");
    if (firstDessert >= 0) expect(order.slice(firstDessert).every((c) => c === "dessert" || c === "side")).toBe(true);
  });

  it("is deterministic", () => {
    const p = profile({ cuisines: ["mexican"], likedFlavors: ["smoky"] });
    expect(recommend(menu("casa-comal"), p).ranked.map((d) => d.dish.key)).toEqual(
      recommend(menu("casa-comal"), p).ranked.map((d) => d.dish.key),
    );
  });
});

describe("recommend — dietary safety", () => {
  it("holds back dishes whose menu text lists a restricted ingredient", () => {
    const r = recommend(menu("nonna-fig"), profile({ restrictions: ["tree-nuts"] }));
    const salad = byName(r, "Arugula Salad");
    expect(salad.safety.status).toBe("conflict");
    expect(r.heldBack).toContain(salad);
    expect(r.picks).not.toContain(salad);
  });

  it("flags likely conflicts from typical recipes without claiming certainty", () => {
    const dishes = enrichMenu([{ name: "Pad Thai" }, { name: "Garden Salad", description: "Lettuce, cucumber, lemon" }]);
    const r = recommend(dishes, profile({ restrictions: ["peanuts"] }));
    const padThai = byName(r, "Pad Thai");
    expect(padThai.safety.status).toBe("likely-conflict");
    expect(padThai.safety.notes[0]).toMatch(/usually contains peanuts/i);
    expect(padThai.safety.notes[0]).toMatch(/not stated/i);
  });

  it("never describes a dish as safe or allergen-free", () => {
    const all = SAMPLE_MENUS.flatMap((m) => enrichMenu(m.items, { menuKey: m.id, menuCuisine: m.cuisine }));
    const r = recommend(all, profile({ restrictions: ["peanuts", "shellfish", "gluten"] }));
    for (const d of r.ranked) {
      expect(d.safety.status).not.toBe("not-applicable");
      for (const n of d.safety.notes) {
        expect(n).not.toMatch(/\bsafe\b|allergen[- ]free|guarantee/i);
      }
      if (d.safety.status === "unverified") expect(d.safety.notes.join(" ")).toMatch(/confirm/i);
    }
  });

  it("applies diets: vegetarians don't get meat in their picks", () => {
    const r = recommend(menu("saffron-steps"), profile({ diet: "vegetarian" }));
    for (const p of r.picks) {
      expect(p.dish.groups.some((g) => ["poultry", "lamb", "beef", "pork", "fish", "shellfish"].includes(g.value))).toBe(false);
    }
    expect(byName(r, "Lamb Vindaloo").safety.status).toBe("conflict");
  });

  it("gives credit for an explicit diet label but still tells allergy sufferers to confirm", () => {
    const dishes = menu("casa-comal");
    const vegan = recommend(dishes, profile({ diet: "vegan" }));
    expect(byName(vegan, "Mushroom Tacos").safety.status).toBe("labeled");
    const allergic = recommend(dishes, profile({ diet: "vegan", restrictions: ["sesame"] }));
    expect(byName(allergic, "Mushroom Tacos").safety.status).toBe("unverified");
  });
});

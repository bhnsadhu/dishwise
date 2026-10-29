import { describe, expect, it } from "vitest";
import { emptyProfile } from "@/lib/domain/schemas";
import { enrichMenu } from "@/lib/menu/enrich";
import { dishMarks, highlight } from "./marks";
import { recommend } from "./rank";

const scored = (items: Parameters<typeof enrichMenu>[0], p: Partial<ReturnType<typeof emptyProfile>>) =>
  recommend(enrichMenu(items), { ...emptyProfile(), ...p }).ranked;

describe("dishMarks", () => {
  it("underlines stated liked ingredients and flavours, wavy for dislikes", () => {
    const [r] = scored([{ name: "Ramen", description: "Smoky pork broth, cilantro, egg" }], {
      likedIngredients: ["pork"],
      dislikedIngredients: ["cilantro"],
      likedFlavors: ["smoky"],
    });
    const m = dishMarks(r);
    expect(m.terms).toEqual(expect.arrayContaining([{ term: "pork", kind: "pos" }, { term: "cilantro", kind: "neg" }, { term: "smoky", kind: "pos" }]));
  });

  it("strikes the words that cause a dietary conflict", () => {
    const [r] = scored([{ name: "Chicken Skewers", description: "Grilled chicken, peanut sauce" }], { restrictions: ["peanuts"] });
    expect(dishMarks(r).terms).toContainEqual({ term: "peanut", kind: "bad" });
  });

  it("keeps inferred evidence out of the text and in margin notes", () => {
    const [r] = scored([{ name: "Pad Thai" }], { likedIngredients: ["egg"] });
    const m = dishMarks(r);
    expect(m.terms).toEqual([]);
    expect(m.inferred.map((c) => c.text)).toContain("Usually has egg");
  });
});

describe("highlight", () => {
  it("marks words case- and accent-insensitively, keeping original text", () => {
    const segs = highlight("Crème fraîche, Pork belly & pickled onions", [
      { term: "creme fraiche", kind: "pos" },
      { term: "onion", kind: "neg" },
      { term: "pork", kind: "pos" },
    ]);
    expect(segs.map((s) => s.text).join("")).toBe("Crème fraîche, Pork belly & pickled onions");
    expect(segs.filter((s) => s.kind).map((s) => [s.text, s.kind])).toEqual([
      ["Crème fraîche", "pos"],
      ["Pork", "pos"],
      ["onions", "neg"],
    ]);
  });

  it("does not match inside other words", () => {
    expect(highlight("Eggplant parm", [{ term: "egg", kind: "pos" }])).toEqual([{ text: "Eggplant parm" }]);
  });

  it("returns the text untouched when there is nothing to mark", () => {
    expect(highlight("Tacos", [])).toEqual([{ text: "Tacos" }]);
  });
});

import { describe, expect, it } from "vitest";
import { emptyProfile } from "@/lib/domain/schemas";
import { enrichMenu } from "@/lib/menu/enrich";
import { sampleMenuById } from "@/lib/menu/samples";
import { recommend } from "./rank";
import { commonReasons, topReasons } from "./reasons";

const lantern = () => {
  const m = sampleMenuById("lantern-noodle-bar")!;
  return enrichMenu(m.items, { menuKey: m.id, menuCuisine: m.cuisine });
};

describe("reasons", () => {
  it("treats a reason shared by nearly every dish as common", () => {
    const rec = recommend(lantern(), { ...emptyProfile(), cuisines: ["japanese"] });
    const common = commonReasons(rec);
    expect([...common].some((t) => t.startsWith("Japanese"))).toBe(true);
    for (const r of rec.ranked) expect(topReasons(r, 3, common).every((x) => !common.has(x.text))).toBe(true);
  });

  it("returns only positive reasons, at most n, and marks guesses as inferred", () => {
    const rec = recommend(lantern(), { ...emptyProfile(), likedIngredients: ["pork", "egg"], likedFlavors: ["umami"] });
    for (const r of rec.ranked) {
      const reasons = topReasons(r, 2);
      expect(reasons.length).toBeLessThanOrEqual(2);
      for (const x of reasons) {
        const c = r.contributions.find((k) => k.text === x.text)!;
        expect(c.points).toBeGreaterThan(0);
        expect(x.inferred).toBe(c.basis === "inferred");
      }
    }
  });

  it("falls back to menu signals only when nothing about you applies", () => {
    const rec = recommend(lantern(), emptyProfile());
    for (const r of rec.ranked) {
      const personal = r.contributions.some((c) => c.points > 0 && c.kind !== "menu-signal");
      if (!personal) continue;
      const kinds = topReasons(r, 5).map((x) => r.contributions.find((c) => c.text === x.text)!.kind);
      expect(kinds).not.toContain("menu-signal");
    }
  });
});

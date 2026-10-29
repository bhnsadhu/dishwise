import { describe, expect, it } from "vitest";
import { enrichDish, enrichMenu } from "./enrich";
import { SAMPLE_MENUS } from "./samples";

const ing = (d: ReturnType<typeof enrichDish>, id: string) => d.ingredients.find((i) => i.value === id);
const group = (d: ReturnType<typeof enrichDish>, id: string) => d.groups.find((g) => g.value === id);

describe("enrichDish", () => {
  it("marks ingredients found in menu text as stated", () => {
    const d = enrichDish({ name: "Spicy Miso Ramen", description: "Miso broth, ground pork, chili oil, soft egg" });
    expect(ing(d, "soy-sauce")?.source).toBe("stated");
    expect(ing(d, "pork")?.source).toBe("stated");
    expect(ing(d, "egg")?.because).toContain("description");
  });

  it("marks archetype-derived ingredients as inferred, with a reason", () => {
    const d = enrichDish({ name: "Pad Thai" });
    const peanut = ing(d, "peanut");
    expect(peanut?.source).toBe("inferred");
    expect(peanut?.because).toBe("usually in Pad thai");
    expect(group(d, "peanuts")?.source).toBe("inferred");
  });

  it("does not infer a different protein when the menu names one", () => {
    const d = enrichDish({ name: "Shio Chicken Ramen", description: "Clear chicken broth, spinach" });
    expect(ing(d, "pork")).toBeUndefined();
    expect(ing(d, "egg")?.source).toBe("inferred");
  });

  it("does not invent anything for an unknown dish with no description", () => {
    const d = enrichDish({ name: "The Wanderer" });
    expect(d.ingredients).toEqual([]);
    expect(d.flavors).toEqual([]);
    expect(d.spice).toBeNull();
    expect(d.cuisine).toBeNull();
    expect(d.completeness).toBe(0);
  });

  it("respects explicit negation and -free suffixes", () => {
    const d = enrichDish({ name: "Garden Burger", description: "Lettuce, tomato, no onions, egg-free aioli" });
    expect(ing(d, "onion")).toBeUndefined();
    expect(d.excluded).toContain("onion");
    // "aioli" is an egg term but is described as egg-free
    expect(group(d, "egg")).toBeUndefined();
  });

  it("does not let negation leak into the next clause", () => {
    const d = enrichDish({ name: "Bowl", description: "No cilantro, topped with peanuts" });
    expect(ing(d, "cilantro")).toBeUndefined();
    expect(ing(d, "peanut")?.source).toBe("stated");
  });

  it("treats plant-based substitutes as the ingredient without its allergen group", () => {
    const d = enrichDish({ name: "Plant Plate", description: "Vegan cheese, oat milk" });
    expect(ing(d, "cheese")?.substitute).toBe(true);
    expect(group(d, "dairy")).toBeUndefined();
  });

  it("lets a vegan label cancel inferred animal ingredients but not stated ones", () => {
    const vegan = enrichDish({ name: "Vegan Ramen", description: "Shiitake broth, tofu (VG)" });
    expect(vegan.labels).toContain("vegan");
    expect(ing(vegan, "pork")).toBeUndefined();

    const contradictory = enrichDish({ name: "Vegan Special", description: "Grilled chicken, rice. Vegan" });
    expect(group(contradictory, "poultry")?.source).toBe("stated");
  });

  it("reads stated heat before inferring it", () => {
    expect(enrichDish({ name: "Wings", description: "Very spicy buffalo sauce" }).spice).toMatchObject({ value: 4, source: "stated" });
    expect(enrichDish({ name: "Curry 🌶🌶" }).spice).toMatchObject({ value: 3, source: "stated" });
    expect(enrichDish({ name: "Butter Chicken", description: "Creamy tomato sauce. Mild" }).spice).toMatchObject({ value: 1, source: "stated" });
    expect(enrichDish({ name: "Noodles", description: "Garlic, chili oil" }).spice).toMatchObject({ value: 2, source: "inferred" });
    expect(enrichDish({ name: "Mild cheddar toastie" }).spice?.source).not.toBe("stated");
  });

  it("avoids common false-positive terms", () => {
    const d = enrichDish({ name: "Cookie", description: "Chocolate chips, sea salt" });
    expect(ing(d, "potato")).toBeUndefined();
    expect(ing(d, "chocolate")).toBeDefined();
    const pb = enrichDish({ name: "Toast", description: "Peanut butter, banana" });
    expect(group(pb, "dairy")).toBeUndefined();
    expect(group(pb, "peanuts")).toBeDefined();
  });

  it("derives course from the menu section, else from the archetype", () => {
    expect(enrichDish({ name: "Arancini", section: "Antipasti" }).course).toMatchObject({ value: "starter", source: "stated" });
    expect(enrichDish({ name: "Tiramisu" }).course).toMatchObject({ value: "dessert", source: "inferred" });
  });

  it("prefers menu cuisine (stated) over archetype cuisine (inferred)", () => {
    expect(enrichDish({ name: "Pad Thai" }, { menuCuisine: "vietnamese" }).cuisine?.source).toBe("stated");
    expect(enrichDish({ name: "Pad Thai" }).cuisine).toMatchObject({ value: "thai", source: "inferred" });
  });
});

describe("enrichMenu", () => {
  it("produces unique keys even when names repeat", () => {
    const dishes = enrichMenu([{ name: "Tacos" }, { name: "Tacos" }], { menuKey: "m" });
    expect(new Set(dishes.map((d) => d.key)).size).toBe(2);
  });

  it("enriches every sample menu without throwing and finds stated ingredients for most dishes", () => {
    for (const menu of SAMPLE_MENUS) {
      const dishes = enrichMenu(menu.items, { menuKey: menu.id, menuCuisine: menu.cuisine });
      const withStated = dishes.filter((d) => d.ingredients.some((i) => i.source === "stated"));
      expect(withStated.length / dishes.length).toBeGreaterThan(0.7);
    }
  });
});

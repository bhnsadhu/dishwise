import { describe, expect, it } from "vitest";
import { parseMenuText } from "./parse";

const items = (t: string) => parseMenuText(t).items.map((i) => ({ name: i.name, description: i.description, priceCents: i.priceCents }));

/** Formats people get when they copy a menu off a website or a delivery app. */
describe("pasted web menus", () => {
  it("delivery-app style: name, price, description on separate lines, with tags and calories", () => {
    const t = ["Popular", "Spicy Tuna Roll", "$14.00", "Tuna, spicy mayo, cucumber", "#1 most liked", "Salmon Avocado Roll", "$13.50", "520 Cal.", "Salmon, avocado, sesame", "Edamame", "$6.00"].join("\n");
    expect(items(t)).toEqual([
      { name: "Spicy Tuna Roll", description: "Tuna, spicy mayo, cucumber", priceCents: 1400 },
      { name: "Salmon Avocado Roll", description: "Salmon, avocado, sesame", priceCents: 1350 },
      { name: "Edamame", description: undefined, priceCents: 600 },
    ]);
  });

  it("price in the middle of a line, before the description", () => {
    expect(items("Margherita Pizza $16 tomato, mozzarella, basil\nGarlic Knots $7 butter, parmesan")).toEqual([
      { name: "Margherita Pizza", description: "tomato, mozzarella, basil", priceCents: 1600 },
      { name: "Garlic Knots", description: "butter, parmesan", priceCents: 700 },
    ]);
  });

  it("tab-separated rows copied from a table", () => {
    expect(items("Pad Thai\t$15.95\nGreen Curry\t$16.95")).toEqual([
      { name: "Pad Thai", description: undefined, priceCents: 1595 },
      { name: "Green Curry", description: undefined, priceCents: 1695 },
    ]);
  });

  it("restaurant-site style with a separator dot and calories inline", () => {
    expect(items("Cheeseburger · $12 · 780 Cal\nAmerican cheese, pickles, onion")).toEqual([
      { name: "Cheeseburger", description: "American cheese, pickles, onion", priceCents: 1200 },
    ]);
  });
});

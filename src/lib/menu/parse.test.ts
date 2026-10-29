import { describe, expect, it } from "vitest";
import { parseMenuText, type OcrLine } from "./parse";

const names = (r: ReturnType<typeof parseMenuText>) => r.items.map((i) => i.name);

describe("parseMenuText — clear printed menus", () => {
  const text = `
    TRATTORIA ESEMPIO
    ANTIPASTI
    Burrata $14
    heirloom tomato, basil oil
    Fried Calamari ........ $16.50
    lemon aioli
    PASTA
    Cacio e Pepe $21
    Wild Mushroom Pappardelle $24
    porcini, cream, thyme
  `;
  const r = parseMenuText(text);

  it("finds dishes, prices and descriptions", () => {
    expect(names(r)).toEqual(["Burrata", "Fried Calamari", "Cacio e Pepe", "Wild Mushroom Pappardelle"]);
    expect(r.items[1]).toMatchObject({ priceCents: 1650, description: "lemon aioli", section: "ANTIPASTI" });
    expect(r.items[2]).toMatchObject({ priceCents: 2100, section: "PASTA" });
    expect(r.items[2].description).toBeUndefined();
  });

  it("detects sections", () => {
    expect(r.sections).toEqual(["TRATTORIA ESEMPIO", "ANTIPASTI", "PASTA"]);
  });
});

describe("parseMenuText — unusual price formats", () => {
  it("parses decimals, commas, currency symbols, ranges and market price", () => {
    const r = parseMenuText(
      ["Margherita 12", "Calzone 13.5", "Croque Madame €9,50", "Wings 8 / 14", "Whole Lobster MP", "Oysters Market Price", "Lassi ₹180"].join("\n"),
    );
    const by = Object.fromEntries(r.items.map((i) => [i.name, i]));
    expect(by["Margherita"].priceCents).toBe(1200);
    expect(by["Calzone"].priceCents).toBe(1350);
    expect(by["Croque Madame"].priceCents).toBe(950);
    expect(by["Wings"]).toMatchObject({ priceCents: 800, priceText: "8 / 14" });
    expect(by["Wings"].flags).toContain("multiple-prices");
    expect(by["Whole Lobster"]).toMatchObject({ priceCents: undefined, priceText: "MP" });
    expect(by["Oysters"].priceText).toBe("Market Price");
    expect(by["Lassi"].priceCents).toBe(18000);
  });

  it("does not read a trailing number in a dish name as a price when the menu uses $ prices", () => {
    const r = parseMenuText(["Chicken 65 $12.00", "Paneer 65 $11.00", "Dal $9.00", "Naan 2"].join("\n"));
    expect(r.items[0]).toMatchObject({ name: "Chicken 65", priceCents: 1200 });
    const naan = r.items.find((i) => i.name.startsWith("Naan"))!;
    expect(naan.priceCents).toBeUndefined();
  });

  it("attaches a price printed on its own line to the item above", () => {
    const r = parseMenuText("Tonkotsu Ramen\nrich pork broth, chashu\n$18");
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ name: "Tonkotsu Ramen", description: "rich pork broth, chashu", priceCents: 1800 });
  });

  it("attaches a price that ends the description line", () => {
    const r = parseMenuText("Tonkotsu Ramen\nrich pork broth, chashu, egg 18");
    expect(r.items[0]).toMatchObject({ name: "Tonkotsu Ramen", description: "rich pork broth, chashu, egg", priceCents: 1800 });
  });

  it("splits 'Name – description' on one line", () => {
    const r = parseMenuText("Pad Thai – rice noodles, tamarind, peanuts $15");
    expect(r.items[0]).toMatchObject({ name: "Pad Thai", description: "rice noodles, tamarind, peanuts", priceCents: 1500 });
  });
});

describe("parseMenuText — OCR decimal loss", () => {
  it("restores a dropped decimal point when the rest of the menu uses decimals, and flags it", () => {
    const r = parseMenuText(["Olives £3.50", "Bread £4.00", "Soup £9.50", "Oysters £10.50", "Croquettes £350", "Salad £8.00"].join("\n"));
    const cro = r.items.find((i) => i.name === "Croquettes")!;
    expect(cro.priceCents).toBe(350);
    expect(cro.flags).toContain("check-price");
  });

  it("leaves genuinely high prices alone", () => {
    const r = parseMenuText(["Olives £3.50", "Bread £4.00", "Soup £9.50", "Oysters £10.50", "Tasting menu £120"].join("\n"));
    expect(r.items.find((i) => i.name === "Tasting menu")!.priceCents).toBe(12000);
  });
});

describe("parseMenuText — incomplete and noisy input", () => {
  it("keeps dishes without prices or descriptions and flags them", () => {
    const r = parseMenuText("DESSERTS\nTiramisu\nAffogato\nPanna Cotta");
    expect(names(r)).toEqual(["Tiramisu", "Affogato", "Panna Cotta"]);
    for (const i of r.items) {
      expect(i.flags).toContain("no-price");
      expect(i.description).toBeUndefined();
    }
  });

  it("drops OCR garbage and boilerplate instead of inventing dishes", () => {
    const r = parseMenuText(
      ["~~ ;;: ||", "Burger $15", "#$%&*", "www.example.com", "18% gratuity added for parties of 6+", "Consuming raw or undercooked meats may increase risk", "Fries $6"].join("\n"),
    );
    expect(names(r)).toEqual(["Burger", "Fries"]);
    expect(r.ignored.length).toBeGreaterThanOrEqual(4);
  });

  it("flags low OCR confidence (e.g. blurry photos)", () => {
    const lines: OcrLine[] = [
      { text: "Bibimbap $16", confidence: 92 },
      { text: "Kimchi Pancak3 $1l", confidence: 41 },
    ];
    const r = parseMenuText(lines);
    expect(r.items[0].flags).not.toContain("low-confidence");
    expect(r.items[1].flags).toContain("low-confidence");
  });

  it("returns nothing (not fake items) for an empty or failed scan", () => {
    expect(parseMenuText("").items).toEqual([]);
    expect(parseMenuText("   \n \n").items).toEqual([]);
    expect(parseMenuText("@@@@ ### !!!").items).toEqual([]);
  });
});

describe("parseMenuText — multiple columns", () => {
  // Two columns at x 0–280 and 360–640, lines interleaved by y as Tesseract may return them.
  const L = (text: string, col: 0 | 1, row: number): OcrLine => ({
    text,
    confidence: 90,
    bbox: { x0: col === 0 ? 0 : 360, y0: row * 30, x1: col === 0 ? 260 : 640, y1: row * 30 + 20 },
  });
  const lines = [
    L("STARTERS", 0, 0), L("MAINS", 1, 0),
    L("Edamame $6", 0, 1), L("Katsu Curry $17", 1, 1),
    L("sea salt", 0, 2), L("panko chicken, curry, rice", 1, 2),
    L("Gyoza $9", 0, 3), L("Salmon Don $19", 1, 3),
    L("pork, cabbage, chili soy", 0, 4), L("glazed salmon, rice", 1, 4),
  ];
  // Shuffle into row-major order (worst case for naive readers)
  const r = parseMenuText(lines);

  it("reads column by column", () => {
    expect(r.columns).toBe(2);
    expect(names(r)).toEqual(["Edamame", "Gyoza", "Katsu Curry", "Salmon Don"]);
    expect(r.items.find((i) => i.name === "Gyoza")).toMatchObject({ section: "STARTERS", description: "pork, cabbage, chili soy" });
    expect(r.items.find((i) => i.name === "Katsu Curry")).toMatchObject({ section: "MAINS", description: "panko chicken, curry, rice" });
  });
});

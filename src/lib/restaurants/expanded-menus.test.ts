import { describe, expect, it } from "vitest";
import { parseKohinoorMenu } from "./parse-kohinoor";
import { parseKofusionMenu } from "./parse-kofusion";
import { parseFiestaMenu } from "./parse-fiesta";
import { parseJupitersMenu } from "./parse-jupiters";
import { enrichMenu } from "@/lib/menu/enrich";
import { RESTAURANTS } from "./catalog";
import { fetchRestaurantMenu } from "./fetch-menu";

// Authored examples of the public markup; no downloaded menu HTML is committed.
const indianSections = ["APPETIZERS (VEG)", "APPETIZERS (NON-VEG)", "TANDOORI SPECIALS (Served with lentil soup and naan.)", "PANEER SPECIALS - $14.99", "VEGETARIAN ENTRÉES - $13.99 (Vegan preparation available upon request.)", "CHICKEN ENTRÉES - $14.99", "LAMB ENTRÉES - $16.99", "SEAFOOD ENTRÉES - $15.99", "RICE ENTRÉES", "FRIED RICE ENTRÉES", "SPECIALTY BREADS", "SIDE DISHES", "DESSERTS", "LUNCH & DINNER"];
const indian = () => indianSections.map((section, i) => `<div class="menuCategory"><h3 class="menuCategroyTitle">${section}</h3><div class="menuItemBox"><div class="menuItemName">${i + 1}. Dish ${i}</div><div class="menuItemDesc">Spinach and spices</div><div class="menuItemPrice">${i === 2 ? "$10/20" : i === 3 || i === 4 ? "" : "$11.00"}</div></div></div>`).join("");
const fusion = () => ["STARTERS", "SALADS", "KITCHEN SPECIALS", "ENTREES"].map((section, i) => `<div class="uvc-heading"><div class="uvc-sub-heading">${section}</div></div><div class="uvc-heading"><div class="uvc-main-heading"><h2>Dish ${i}</h2></div><div class="uvc-sub-heading">Carrot and rice<p>Protein Choice:<br><em>Tofu</em><br><em>Shrimp</em></p></div></div>`).join("");
const fiesta = () => ["Business Lunch Specials Weekdays 11am-5pm", "Aperitivos - Appetizers"].map((section, i) => `<h3 data-aid="MENU_SECTION_TITLE_${i}">${section}</h3><p data-aid="MENU_SECTION_DESCRIPTION_${i}">Choose chicken or tofu</p><h4 data-aid="MENU_SECTION${i}_ITEM0_TITLE">Dish ${i}</h4><div data-aid="MENU_SECTION${i}_ITEM0_PRICE">${i ? "Reg 5.95 Large 10.45" : "12.45"}</div><p data-aid="MENU_SECTION${i}_ITEM0_DESC">Rice and tomato</p>`).join("");
const pizza = () => ["Starters", "Sides", "Grinders", "Salads", "Specialty"].map((section, i) => `<section class="menu-section"><h2>${section}</h2><ul><li class="menu-item"><p class="menu-item__heading--name">Dish ${i}</p><p class="menu-item__details--description">Tomato and basil</p><p class="menu-item__details--price">${i === 4 ? "SMALL $10" : "$12.50"}</p>${i === 4 ? '<p class="menu-item__details--price">LARGE $20</p>' : ""}<p class="menu-item__details--addon">Add chicken $3</p></li></ul></section>`).join("");

describe("reviewed restaurant adapters", () => {
  it("inherits section prices and included sides without calling a preparation choice vegan", () => {
    const menu = parseKohinoorMenu(indian());
    expect(menu.items[3].priceCents).toBe(1499);
    expect(menu.items[4]).toMatchObject({ priceCents: 1399, optionsText: "Vegan preparation available upon request." });
    expect(menu.items[4].description).not.toContain("Vegan");
    expect(menu.items[2]).toMatchObject({ priceText: "$10/20", description: "Spinach and spices. Served with lentil soup and naan." });
    expect(menu.items[2].priceCents).toBeUndefined();
  });
  it("keeps optional proteins visible but outside ingredient extraction, and leaves absent prices absent", () => {
    const menu = parseKofusionMenu(fusion());
    expect(menu.items[0]).toMatchObject({ description: "Carrot and rice", optionsText: "Protein choice: Tofu, Shrimp. Confirm the price for your choice." });
    expect(menu.items.every(item => item.priceCents === undefined && item.priceText === undefined)).toBe(true);
    expect(enrichMenu(menu.items)[0].ingredients.map(item => item.value)).not.toContain("shrimp");
    expect(enrichMenu(menu.items)[0].optionsText).toContain("Shrimp");
  });
  it("preserves lunch context, choices and size-dependent prices", () => {
    const menu = parseFiestaMenu(fiesta());
    expect(menu.items[0]).toMatchObject({ priceCents: 1245, section: "Business Lunch Specials Weekdays 11am-5pm", optionsText: "Choose chicken or tofu" });
    expect(menu.items[1]).toMatchObject({ priceText: "Regular $5.95 / Large $10.45" });
    expect(menu.items[1].priceCents).toBeUndefined();
  });
  it("distinguishes pizza and grinder feedback identities, and separates add-on prices", () => {
    const menu = parseJupitersMenu(pizza().replace('SMALL $10', '(onions suggested)</p><p class="menu-item__details--price">SMALL $10'));
    expect(menu.items[2].name).toBe("Dish 2 grinder");
    expect(menu.items[4]).toMatchObject({ name: "Dish 4 pizza", priceText: "SMALL $10 / LARGE $20", optionsText: "Add chicken $3. (onions suggested)", description: "Tomato and basil" });
    expect(menu.items[4].priceCents).toBeUndefined();
    expect(menu.items[0].priceCents).toBe(1250);
  });
  for (const [name, parser, fixture] of [["Kohinoor", parseKohinoorMenu, indian], ["KoFusion", parseKofusionMenu, fusion], ["Fiesta", parseFiestaMenu, fiesta], ["Jupiter's", parseJupitersMenu, pizza]] as const) {
    it(`${name} rejects missing and duplicate menu sections`, () => {
      expect(() => parser("<p>Menu unavailable</p>")).toThrow();
      expect(() => parser(fixture() + fixture())).toThrow();
    });
  }
});

it.skipIf(process.env.TEST_RESTAURANT_SOURCES !== "1")("loads every reviewed public source with valid, distinct food dishes", async () => {
  for (const restaurant of RESTAURANTS) {
    const result = await fetchRestaurantMenu(restaurant.id);
    expect(result.status, restaurant.id).toBe("ready");
    if (result.status !== "ready") continue;
    const dishes = enrichMenu(result.menu.items);
    expect(new Set(dishes.map(dish => dish.key)).size, restaurant.id).toBe(dishes.length);
    console.info(restaurant.id, JSON.stringify({ dishes: dishes.length, fixedPrices: result.menu.items.filter(item => item.priceCents !== undefined).length, sizePrices: result.menu.items.filter(item => item.priceText).length, options: result.menu.items.filter(item => item.optionsText).length }));
  }
}, 60_000);

import { load } from "cheerio";
import { menuInputSchema, type MenuInput, type MenuItemInput } from "@/lib/domain/schemas";

const FOOD_SECTIONS = ["Snacks", "Salads & Wraps", "Sandwiches", "Watson's Hot", "Tenders", "Sides"];
const EXCLUDED_SECTIONS = new Set(["Additions", "Sauces"]);
const clean = (text: string) => text.replace(/\s+/g, " ").replace(/[\u2013\u2014]/g, "-").trim();
const sectionName = (text: string) => clean(text).replaceAll("’", "'");

function priceFields(text: string): Pick<MenuItemInput, "priceCents" | "priceText"> {
  if (!text) return {};
  const fixed = /^\$\s*(\d+(?:\.\d{1,2})?)$/.exec(text);
  // A size range is not a single price. Keep it intact and out of numeric budget scoring.
  return fixed ? { priceCents: Math.round(Number(fixed[1]) * 100) } : { priceText: text };
}

/** The public HTML menu, not Squarespace's private API, cart or ordering session. */
export function parseWatsonsMenu(html: string): MenuInput {
  const $ = load(html);
  $("script, style, noscript").remove();
  $("br").replaceWith(" ");
  const sections = $(".sqs-block-menu .menu-section");
  const seen = new Set<string>();
  const identities = new Set<string>();
  const items: MenuItemInput[] = [];

  sections.each((_, element) => {
    const section = $(element);
    const name = sectionName(section.find(".menu-section-title").first().text());
    if (EXCLUDED_SECTIONS.has(name)) return;
    if (!FOOD_SECTIONS.includes(name) || seen.has(name)) throw new Error("Menu sections changed");
    seen.add(name);
    const shared = clean(section.find(".menu-section-description").first().text());
    const entries = section.find(".menu-item");
    if (!entries.length) throw new Error("Menu section is empty");
    const before = items.length;
    entries.each((_, entry) => {
      const item = $(entry);
      const title = clean(item.find(".menu-item-title").first().text());
      // The source renders sandwich add-ons as a menu item, although they are not a dish.
      if (title.toLowerCase() === "additions") return;
      const identity = `${name}:${title.toLowerCase()}`;
      if (!title || identities.has(identity)) throw new Error("Missing or duplicate dish");
      identities.add(identity);
      const description = [clean(item.find(".menu-item-description").first().text()), shared].filter(Boolean).join(". ");
      const price = clean(item.find(".menu-item-price-top").first().text() || item.find(".menu-item-price-bottom").first().text());
      items.push({ name: title, section: name, ...(description ? { description } : {}), ...priceFields(price) });
    });
    if (items.length === before) throw new Error("Menu section has no dishes");
  });

  // A partially rendered menu must not quietly become a complete-looking ranking.
  if (FOOD_SECTIONS.some(section => !seen.has(section))) throw new Error("Incomplete restaurant menu");
  return menuInputSchema.parse({ title: "Watson’s at The Yard", cuisine: "american", currency: "USD", items });
}

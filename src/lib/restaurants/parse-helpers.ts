import { load } from "cheerio";
import { menuInputSchema, type MenuInput, type MenuItemInput } from "@/lib/domain/schemas";
import type { CuisineId } from "@/lib/domain/vocab";

export const clean = (text: string) => text.replace(/\s+/g, " ").trim();
export function loadMenu(html: string) {
  const $ = load(html);
  $("script, style, noscript").remove();
  $("br").replaceWith(" ");
  return $;
}
export function priceFields(text: string): Pick<MenuItemInput, "priceCents" | "priceText"> {
  if (!text) return {};
  const fixed = /^\$?\s*(\d+(?:\.\d{1,2})?)$/.exec(text);
  return fixed ? { priceCents: Math.round(Number(fixed[1]) * 100) } : { priceText: text };
}
export function finishMenu(title: string, cuisine: CuisineId, items: MenuItemInput[], expected: readonly string[], seen: Set<string>): MenuInput {
  if (expected.some(section => !seen.has(section))) throw new Error("Incomplete restaurant menu");
  // The existing feedback key is derived from the dish name. Reject ambiguous identities.
  const identities = items.map(item => item.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim());
  if (new Set(identities).size !== identities.length) throw new Error("Duplicate dish identities");
  return menuInputSchema.parse({ title, cuisine, currency: "USD", items });
}
export function seeSection(name: string, seen: Set<string>, count: number) {
  if (seen.has(name) || !count) throw new Error("Duplicate or empty menu section");
  seen.add(name);
}

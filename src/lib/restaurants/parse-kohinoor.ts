import type { MenuItemInput } from "@/lib/domain/schemas";
import { clean, finishMenu, loadMenu, priceFields, seeSection } from "./parse-helpers";

const SECTIONS = ["APPETIZERS (VEG)", "APPETIZERS (NON-VEG)", "TANDOORI SPECIALS", "PANEER SPECIALS", "VEGETARIAN ENTRÉES", "CHICKEN ENTRÉES", "LAMB ENTRÉES", "SEAFOOD ENTRÉES", "RICE ENTRÉES", "FRIED RICE ENTRÉES", "SPECIALTY BREADS", "SIDE DISHES", "DESSERTS", "LUNCH & DINNER"];

export function parseKohinoorMenu(html: string) {
  const $ = loadMenu(html);
  const seen = new Set<string>();
  const items: MenuItemInput[] = [];
  $(".menuCategory").each((_, element) => {
    const category = $(element);
    const heading = clean(category.find(".menuCategroyTitle").text());
    if (heading === "DRINKS") return;
    const section = SECTIONS.find(name => heading === name || heading.startsWith(`${name} `));
    if (!section) throw new Error("Kohinoor menu section changed");
    const entries = category.find(".menuItemBox");
    seeSection(section, seen, entries.length);
    const sharedPrice = heading.match(/-\s*(\$\d+(?:\.\d{2})?)/)?.[1] ?? "";
    const accompaniment = heading.match(/\((Served with [^)]+)\)/i)?.[1] ?? "";
    const preparation = heading.match(/Vegan preparation available upon request\./i)?.[0];
    entries.each((_, element) => {
      const item = $(element);
      const name = clean(item.find(".menuItemName").text()).replace(/^\d+\.\s*/, "");
      const description = [clean(item.find(".menuItemDesc").text()), accompaniment].filter(Boolean).join(". ");
      items.push({ name, section: section === "LUNCH & DINNER" ? "Vegan lunch & dinner" : section, description, ...(preparation ? { optionsText: preparation } : {}), ...priceFields(clean(item.find(".menuItemPrice").text()) || sharedPrice) });
    });
  });
  return finishMenu("Kohinoor", "indian", items, SECTIONS, seen);
}

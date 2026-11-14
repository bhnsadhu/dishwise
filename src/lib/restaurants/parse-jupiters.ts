import type { MenuItemInput } from "@/lib/domain/schemas";
import { clean, finishMenu, loadMenu, priceFields, seeSection } from "./parse-helpers";

const SECTIONS = ["Starters", "Sides", "Grinders", "Salads", "Specialty"];
const EXCLUDED = new Set(["Dressings", "Soft Drinks", "Juice", "Red Bull", "Create-Your-Own", "Sauce + Toppings", "Beer - Bottles & Cans", "Wine", "Seltzer Sunday", "Cheap Date!", "Wednesday"]);

export function parseJupitersMenu(html: string) {
  const $ = loadMenu(html);
  const items: MenuItemInput[] = [];
  const seen = new Set<string>();
  $(".menu-section").each((_, element) => {
    const category = $(element);
    const section = clean(category.find("h2,h3").first().text());
    if (!section || EXCLUDED.has(section)) return;
    if (!SECTIONS.includes(section)) throw new Error("Jupiter's menu section changed");
    const entries = category.find("li.menu-item");
    seeSection(section, seen, entries.length);
    entries.each((_, element) => {
      const item = $(element);
      const title = clean(item.find(".menu-item__heading--name").text());
      const sourceDescription = clean(item.find(".menu-item__details--description").text());
      if (!title && sourceDescription === "Ask About Our Pizza of The Month") return;
      // The source lists this identical side twice. Keep one feedback identity.
      if (section === "Salads" && title === "Side Salad") return;
      const suffix = section === "Specialty" ? " pizza" : section === "Grinders" ? " grinder" : section === "Salads" && !/salad/i.test(title) ? " salad" : "";
      const suggestion = sourceDescription.match(/\(([^)]+ suggested)\)/i)?.[1];
      const description = sourceDescription.replace(/\s*\([^)]+ suggested\)/i, "");
      const priceLines = item.find(".menu-item__details--price").map((_, el) => clean($(el).text())).get();
      // This source also renders a suggested-toppings note in a price element.
      const priceNotes = priceLines.filter(line => /^\([^)]+ suggested\)$/i.test(line));
      const extras = [clean(item.find(".menu-item__details--addon").text()), suggestion, ...priceNotes].filter(Boolean).join(". ");
      const price = priceLines.filter(line => !priceNotes.includes(line)).join(" / ");
      items.push({ name: title ? `${title}${suffix}` : "", section: section === "Specialty" ? "Specialty pizza" : section, description, ...(extras ? { optionsText: extras } : {}), ...priceFields(price) });
    });
  });
  return finishMenu("Jupiter’s Downtown", "italian", items, SECTIONS, seen);
}

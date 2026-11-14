import type { MenuItemInput } from "@/lib/domain/schemas";
import { clean, finishMenu, loadMenu, seeSection } from "./parse-helpers";

const SECTIONS = ["STARTERS", "SALADS", "KITCHEN SPECIALS", "ENTREES"];

/** The kitchen page lists no prices. Optional proteins live in separate italic paragraphs. */
export function parseKofusionMenu(html: string) {
  const $ = loadMenu(html);
  const seen = new Set<string>();
  const items: MenuItemInput[] = [];
  let section = "";
  $(".uvc-heading").each((_, element) => {
    const block = $(element);
    const name = clean(block.find(".uvc-main-heading h2").text());
    const detail = block.find(".uvc-sub-heading").clone();
    if (!name) {
      const heading = clean(detail.text());
      if (!heading) return;
      if (!SECTIONS.includes(heading)) throw new Error("KoFusion menu section changed");
      seeSection(heading, seen, 1);
      section = heading;
      return;
    }
    if (!section) throw new Error("Missing KoFusion section");
    const choices = detail.find("em").map((_, el) => clean($(el).text())).get().filter(Boolean);
    detail.find("em").remove();
    const description = clean(detail.text()).replace(/\s*Protein Choice:\s*$/i, "");
    items.push({ name, section, description, ...(choices.length ? { optionsText: `Protein choice: ${choices.join(", ")}. Confirm the price for your choice.` } : {}) });
  });
  for (const name of SECTIONS) if (!items.some(item => item.section === name)) throw new Error("Empty KoFusion section");
  return finishMenu("KoFusion Downtown", "japanese", items, SECTIONS, seen);
}

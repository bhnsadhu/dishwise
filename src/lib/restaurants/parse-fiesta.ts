import type { MenuItemInput } from "@/lib/domain/schemas";
import { clean, finishMenu, loadMenu, priceFields, seeSection } from "./parse-helpers";

const SECTIONS = ["Business Lunch Specials Weekdays 11am-5pm", "Aperitivos - Appetizers"];

export function parseFiestaMenu(html: string) {
  const $ = loadMenu(html);
  const seen = new Set<string>();
  const items: MenuItemInput[] = [];
  $("[data-aid^='MENU_SECTION_TITLE_']").each((_, element) => {
    const id = $(element).attr("data-aid")?.match(/^MENU_SECTION_TITLE_(\d+)$/)?.[1];
    if (id === undefined) return;
    const section = clean($(element).text());
    if (!SECTIONS.includes(section)) throw new Error("Fiesta menu section changed");
    const entries = $(`[data-aid^='MENU_SECTION${id}_ITEM'][data-aid$='_TITLE']`);
    seeSection(section, seen, entries.length);
    const choices = clean($(`[data-aid='MENU_SECTION_DESCRIPTION_${id}']`).text());
    entries.each((_, element) => {
      const prefix = $(element).attr("data-aid")!.replace(/_TITLE$/, "");
      const description = clean($(`[data-aid='${prefix}_DESC']`).text());
      const price = clean($(`[data-aid='${prefix}_PRICE']`).text()).replace(/^Reg\s+(\d+\.\d{2})\s+Large\s+(\d+\.\d{2})$/i, (_, regular, large) => `Regular $${regular} / Large $${large}`);
      items.push({ name: clean($(element).text()), section, description, ...(choices ? { optionsText: choices } : {}), ...priceFields(price) });
    });
  });
  return finishMenu("Fiesta Cafe", "mexican", items, SECTIONS, seen);
}

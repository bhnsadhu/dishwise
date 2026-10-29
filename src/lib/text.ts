/** Lowercase, strip diacritics, unify apostrophes/dashes. Positions are NOT preserved. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Word-boundary regex for a phrase that also accepts simple plurals ("onion" ⇢ "onions"). */
export function phraseRegex(phrase: string, flags = "g"): RegExp {
  const body = escapeRegex(phrase).replace(/\s+/g, "[\\s-]+");
  return new RegExp(`(?<![a-z0-9])${body}(?:e?s)?(?![a-z0-9])`, flags);
}

export function slugify(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

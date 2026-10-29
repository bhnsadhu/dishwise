import { ARCHETYPES, type Archetype } from "@/lib/domain/archetypes";
import { INGREDIENTS, ingredientById } from "@/lib/domain/ingredients";
import type { MenuItemInput } from "@/lib/domain/schemas";
import type { Course, CuisineId, FlavorId, GroupId, SpiceLevel } from "@/lib/domain/vocab";
import { normalize, phraseRegex, slugify } from "@/lib/text";

/**
 * stated   — the words are on the menu (name/description/section/label).
 * inferred — derived from typical recipes or from other stated attributes; may be wrong.
 * Absent attributes are simply missing: we never fill gaps with guesses.
 */
export type Source = "stated" | "inferred";

export interface Evidence<T> {
  value: T;
  source: Source;
  /** Human-readable trace, e.g. `"miso" in description` or `usually in Ramen`. */
  because: string;
}

export type DietLabel = "vegetarian" | "vegan" | "gluten-free" | "dairy-free" | "nut-free";

export interface EnrichedDish {
  key: string;
  name: string;
  description?: string;
  priceCents?: number;
  priceText?: string;
  section?: string;
  course: Evidence<Course> | null;
  cuisine: Evidence<CuisineId> | null;
  archetype: { id: string; label: string } | null;
  ingredients: (Evidence<string> & { substitute?: boolean })[];
  flavors: Evidence<FlavorId>[];
  spice: Evidence<SpiceLevel> | null;
  /** Allergen/diet groups implied by non-substitute ingredients. */
  groups: (Evidence<GroupId> & { via: string })[];
  /** Explicit menu labels, e.g. "(V)", "gluten-free". */
  labels: DietLabel[];
  /** Ingredients the menu explicitly says are left out ("no onions"). */
  excluded: string[];
  /** 0–1: how much of the attribute space is backed by stated menu text. */
  completeness: number;
}

// ---------------------------------------------------------------------------------------------
// Term index (built once)

interface TermEntry {
  ingredientId: string;
  term: string;
  re: RegExp;
}

const TERMS: TermEntry[] = INGREDIENTS.flatMap((ing) =>
  ing.terms.map((term) => ({ ingredientId: ing.id, term, re: phraseRegex(normalize(term)) })),
).sort((a, b) => b.term.length - a.term.length);

const ARCHETYPE_NAMES = ARCHETYPES.flatMap((a) =>
  a.names.map((n) => ({ archetype: a, name: n, re: phraseRegex(normalize(n), "") })),
).sort((a, b) => b.name.length - a.name.length);

const PROTEIN_GROUPS = new Set<GroupId>(["beef", "pork", "poultry", "lamb", "fish", "shellfish"]);

// ---------------------------------------------------------------------------------------------
// Label, negation and substitute detection

const LABEL_PATTERNS: [DietLabel, RegExp][] = [
  ["vegan", /(?<![a-z])(vegan|\(vg\)|plant[\s-]based)(?![a-z])/],
  ["vegetarian", /(?<![a-z])(vegetarian|veggie|\(v\))(?![a-z])/],
  ["gluten-free", /(?<![a-z])(gluten[\s-]free|\(gf\))(?![a-z])/],
  ["dairy-free", /(?<![a-z])(dairy[\s-]free|non[\s-]dairy|\(df\))(?![a-z])/],
  ["nut-free", /(?<![a-z])(nut[\s-]free)(?![a-z])/],
];

/**
 * Menu dietary codes in parentheses, e.g. "(V)", "(VG, GF, DF)", "(n)". Codes qualified with
 * "on request" / "avail(able)" / "option" describe a variant, not this dish, so they are ignored.
 */
const CODE_LABELS: Record<string, DietLabel> = { v: "vegetarian", vg: "vegan", ve: "vegan", gf: "gluten-free", df: "dairy-free", nf: "nut-free" };
/** Codes that mean the dish *contains* something (common on UK/Thai menus: "(n) = nuts"). */
const CODE_CONTAINS: Record<string, string> = { n: "tree-nut", g: "wheat-flour" };

export function parseDietCodes(text: string): { labels: DietLabel[]; contains: { ingredientId: string; code: string }[] } {
  const labels = new Set<DietLabel>();
  const contains: { ingredientId: string; code: string }[] = [];
  for (const m of text.matchAll(/\(([^()]{1,60})\)/g)) {
    const parts = m[1].split(/[,/;]/).map((p) => p.trim().toLowerCase());
    // Only treat the group as codes if every part is a short code (avoids "(6pcs / 12pcs)", "(8oz)").
    const codes = parts.map((p) => p.replace(/\s*[-–]?\s*(on request|avail(able)?|option(al)?|traces of .*)$/, (x) => (x ? "@" : "")));
    if (!codes.every((c) => /^[a-z]{1,2}@?$/.test(c) || c === "")) continue;
    for (const c of codes) {
      if (!c || c.endsWith("@")) continue;
      if (CODE_LABELS[c]) labels.add(CODE_LABELS[c]);
      else if (CODE_CONTAINS[c]) contains.push({ ingredientId: CODE_CONTAINS[c], code: c });
    }
  }
  return { labels: [...labels], contains };
}

const NEGATION_BEFORE = /(?:^|[\s(,])(no|without|hold the|minus|sans|except|omit)\s+(?:[a-z'-]+\s+){0,2}$/;
const FREE_AFTER = /^[\s-]*free(?![a-z])/;
const SUBSTITUTE_BEFORE =
  /(?:^|\s)(vegan|plant[\s-]based|meatless|faux|mock|impossible|beyond|veggie|vegetarian|[a-z]+[\s-]free|non[\s-]dairy|oat|soy)\s+$/;

/** Clause boundary so negation in one clause does not leak into the next. */
function clauseBefore(text: string, index: number): string {
  const head = text.slice(0, index);
  const cut = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf("."), head.lastIndexOf(" with "), head.lastIndexOf("&"));
  return cut >= 0 ? head.slice(cut + 1) : head;
}

// ---------------------------------------------------------------------------------------------
// Ingredient extraction

interface Mention {
  ingredientId: string;
  term: string;
  where: "name" | "description";
  negated: boolean;
  substitute: boolean;
}

function findMentions(text: string, where: Mention["where"]): Mention[] {
  const taken: [number, number][] = [];
  const out: Mention[] = [];
  for (const entry of TERMS) {
    entry.re.lastIndex = 0;
    for (const m of text.matchAll(entry.re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      const before = clauseBefore(text, start);
      out.push({
        ingredientId: entry.ingredientId,
        term: entry.term,
        where,
        negated: NEGATION_BEFORE.test(before) || FREE_AFTER.test(text.slice(end)),
        substitute: SUBSTITUTE_BEFORE.test(text.slice(Math.max(0, start - 24), start)),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Spice, flavor, course

const SPICE_STATED: [RegExp, SpiceLevel][] = [
  [/(?<![a-z])(not spicy|no heat|non[\s-]spicy)(?![a-z])/, 0],
  [/(?<![a-z])(extra[\s-]spicy|very spicy|fiery|thai[\s-]hot|inferno|blazing|extra hot|very hot)(?![a-z])/, 4],
  [/(?<![a-z])(hot and spicy|spicy hot|nashville hot)(?![a-z])/, 3],
  [/(?<![a-z])(medium[\s-]spicy|medium heat|spicy|with a kick)(?![a-z])/, 2],
  [/(?<![a-z])(mild|mildly)(?![a-z])(?! (?:cheddar|cheese|onion))/, 1],
];

const FLAVOR_WORDS: [RegExp, FlavorId][] = [
  [/(?<![a-z])(smoked|smoky|smokey|charred|chargrilled|flame[\s-]grilled|grilled|wood[\s-]fired|tandoori|bbq)(?![a-z])/, "smoky"],
  [/(?<![a-z])(crispy|crisp|crunchy|fried|tempura|golden)(?![a-z])/, "crispy"],
  [/(?<![a-z])(creamy|velvety|silky)(?![a-z])/, "creamy"],
  [/(?<![a-z])(rich|decadent|indulgent|hearty|braised)(?![a-z])/, "rich"],
  [/(?<![a-z])(tangy|zesty|sour|tart|bright|pickled|citrusy)(?![a-z])/, "tangy"],
  [/(?<![a-z])(fresh|light|crisp salad|raw|chilled)(?![a-z])/, "fresh"],
  [/(?<![a-z])(herb|herbs|herbed|herby|herbaceous)(?![a-z])/, "herby"],
  [/(?<![a-z])(sweet|caramelized|caramelised|honeyed|glazed)(?![a-z])/, "sweet"],
  [/(?<![a-z])(umami|savory|savoury)(?![a-z])/, "umami"],
  [/(?<![a-z])(bitter|bittersweet)(?![a-z])/, "bitter"],
];

const SECTION_COURSES: [RegExp, Course][] = [
  [/(starter|appetizer|appetiser|small plate|antipast|snack|to share|sharing|mezze|meze|soup|salad|dim sum|tapas)/, "starter"],
  [/(dessert|sweet|pudding|dolci|postre)/, "dessert"],
  [/(side|extras|accompaniment|contorni)/, "side"],
  [/(drink|beverage|cocktail|wine|beer|juice|coffee|tea)/, "drink"],
  [/(main|entree|entrée|large plate|pasta|pizza|noodle|ramen|pho|udon|soba|curr|taco|burger|grill|bowl|rice|don\b|sandwich|plate|secondi|primi|specials|tandoor|platos)/, "main"],
];

const NAME_COURSES: [RegExp, Course][] = [
  [/(?<![a-z])(soup|salad|wings|fries|bread|dip|starter)(?![a-z])/, "starter"],
  [/(?<![a-z])(cake|ice cream|gelato|sorbet|pudding|tart|pie|mousse|cookie|sundae)(?![a-z])/, "dessert"],
  [/(?<![a-z])(lemonade|soda|tea|coffee|juice|lassi|smoothie|latte|cocktail|spritz)(?![a-z])/, "drink"],
];

// ---------------------------------------------------------------------------------------------

export interface EnrichOptions {
  /** Prefix for stable dish keys, typically a menu id or slug. */
  menuKey?: string;
  /** Cuisine declared for the whole menu. */
  menuCuisine?: CuisineId;
}

export function matchArchetype(name: string): Archetype | null {
  const n = normalize(name);
  return ARCHETYPE_NAMES.find((a) => a.re.test(n))?.archetype ?? null;
}

export function enrichDish(item: MenuItemInput, opts: EnrichOptions = {}): EnrichedDish {
  const name = item.name.trim();
  const nameN = normalize(name);
  const descN = normalize(item.description ?? "");
  const sectionN = normalize(item.section ?? "");
  const allN = `${nameN} . ${descN}`;

  // Labels
  const codes = parseDietCodes(`${name} ${item.description ?? ""}`);
  const labels = [...new Set([...LABEL_PATTERNS.filter(([, re]) => re.test(allN)).map(([l]) => l), ...codes.labels])];

  // Ingredients
  const mentions = [...findMentions(nameN, "name"), ...findMentions(descN, "description")];
  const excluded = [...new Set(mentions.filter((m) => m.negated).map((m) => m.ingredientId))];
  const ingredients = new Map<string, EnrichedDish["ingredients"][number]>();
  for (const m of mentions) {
    if (m.negated || ingredients.has(m.ingredientId)) continue;
    ingredients.set(m.ingredientId, {
      value: m.ingredientId,
      source: "stated",
      because: `"${m.term}" in ${m.where}`,
      substitute: m.substitute || undefined,
    });
  }

  for (const c of codes.contains) {
    if (!ingredients.has(c.ingredientId)) ingredients.set(c.ingredientId, { value: c.ingredientId, source: "stated", because: `"(${c.code})" on menu` });
  }

  const archetype = matchArchetype(name);
  if (archetype) {
    // When the menu names the protein ("chicken ramen"), don't also infer the archetype's usual one.
    const statedProtein = [...ingredients.keys()].some((id) => ingredientById(id)?.groups?.some((g) => PROTEIN_GROUPS.has(g)));
    for (const id of archetype.ingredients) {
      if (ingredients.has(id) || excluded.includes(id)) continue;
      if (statedProtein && ingredientById(id)?.groups?.some((g) => PROTEIN_GROUPS.has(g))) continue;
      ingredients.set(id, { value: id, source: "inferred", because: `usually in ${archetype.label}` });
    }
  }

  // Groups from ingredients; menu labels cancel inferred groups they contradict (a "vegan ramen"
  // has no inferred pork) but never cancel stated ones — that conflict is surfaced instead.
  const labelCancels = new Set<GroupId>();
  if (labels.includes("vegan")) ["beef", "pork", "poultry", "lamb", "fish", "shellfish", "dairy", "egg", "honey"].forEach((g) => labelCancels.add(g as GroupId));
  if (labels.includes("vegetarian")) ["beef", "pork", "poultry", "lamb", "fish", "shellfish"].forEach((g) => labelCancels.add(g as GroupId));
  if (labels.includes("gluten-free")) labelCancels.add("gluten");
  if (labels.includes("dairy-free")) labelCancels.add("dairy");
  if (labels.includes("nut-free")) ["tree-nuts", "peanuts"].forEach((g) => labelCancels.add(g as GroupId));

  for (const [id, ing] of ingredients) {
    if (ing.source === "inferred") {
      const def = ingredientById(id);
      if (def?.groups?.some((g) => labelCancels.has(g))) ingredients.delete(id);
    }
  }

  const groups: EnrichedDish["groups"] = [];
  for (const ing of ingredients.values()) {
    if (ing.substitute) continue;
    for (const g of ingredientById(ing.value)?.groups ?? []) {
      if (groups.some((x) => x.value === g && x.source === "stated")) continue;
      const existing = groups.findIndex((x) => x.value === g);
      const entry = { value: g, source: ing.source, because: ing.because, via: ing.value };
      if (existing >= 0) {
        if (ing.source === "stated") groups[existing] = entry;
      } else groups.push(entry);
    }
  }

  // Spice
  let spice: EnrichedDish["spice"] = null;
  const chiliCount = (`${item.name} ${item.description ?? ""}`.match(/🌶/gu) ?? []).length;
  if (chiliCount > 0) {
    spice = { value: Math.min(4, chiliCount + 1) as SpiceLevel, source: "stated", because: `${chiliCount} chili marker(s) on menu` };
  } else {
    for (const [re, level] of SPICE_STATED) {
      const m = allN.match(re);
      if (m) {
        spice = { value: level, source: "stated", because: `"${m[1]}" on menu` };
        break;
      }
    }
  }
  if (!spice) {
    let best: EnrichedDish["spice"] = null;
    for (const ing of ingredients.values()) {
      const heat = ingredientById(ing.value)?.heat;
      if (heat !== undefined && (!best || heat > best.value)) {
        best = { value: heat, source: "inferred", because: `contains ${ingredientById(ing.value)?.label.toLowerCase()}` };
      }
    }
    if (archetype?.spice !== undefined && (!best || archetype.spice > best.value)) {
      best = { value: archetype.spice, source: "inferred", because: `${archetype.label} is usually this hot` };
    }
    spice = best;
  }

  // Flavors
  const flavors = new Map<FlavorId, Evidence<FlavorId>>();
  for (const [re, flavor] of FLAVOR_WORDS) {
    const m = allN.match(re);
    if (m && !flavors.has(flavor)) flavors.set(flavor, { value: flavor, source: "stated", because: `"${m[1]}" on menu` });
  }
  for (const ing of ingredients.values()) {
    for (const f of ingredientById(ing.value)?.flavors ?? []) {
      if (!flavors.has(f)) flavors.set(f, { value: f, source: "inferred", because: `from ${ingredientById(ing.value)?.label.toLowerCase()}` });
    }
  }
  for (const f of archetype?.flavors ?? []) {
    if (!flavors.has(f)) flavors.set(f, { value: f, source: "inferred", because: `typical of ${archetype!.label}` });
  }

  // Course
  let courseEv: EnrichedDish["course"] = null;
  const sectionCourse = sectionN ? SECTION_COURSES.find(([re]) => re.test(sectionN)) : undefined;
  if (sectionCourse) courseEv = { value: sectionCourse[1], source: "stated", because: `listed under "${item.section}"` };
  else if (archetype) courseEv = { value: archetype.course, source: "inferred", because: `${archetype.label} is usually a ${archetype.course}` };
  else {
    const byName = NAME_COURSES.find(([re]) => re.test(nameN));
    if (byName) courseEv = { value: byName[1], source: "inferred", because: "from the dish name" };
  }

  // Cuisine
  let cuisine: EnrichedDish["cuisine"] = null;
  if (item.cuisine) cuisine = { value: item.cuisine, source: "stated", because: "set on the menu item" };
  else if (opts.menuCuisine) cuisine = { value: opts.menuCuisine, source: "stated", because: "restaurant cuisine" };
  else if (archetype) cuisine = { value: archetype.cuisine, source: "inferred", because: `${archetype.label} is ${archetype.cuisine}` };

  const statedIngredients = [...ingredients.values()].filter((i) => i.source === "stated").length;
  const signals = [
    statedIngredients >= 2 ? 1 : statedIngredients === 1 ? 0.5 : 0,
    item.description && item.description.trim().length >= 12 ? 1 : 0,
    cuisine?.source === "stated" ? 1 : cuisine ? 0.5 : 0,
    spice?.source === "stated" ? 1 : spice ? 0.5 : 0,
    item.priceCents !== undefined ? 1 : 0,
  ];
  const completeness = Math.round((signals.reduce((a, b) => a + b, 0) / signals.length) * 100) / 100;

  return {
    key: `${opts.menuKey ?? "menu"}::${slugify(name)}`,
    name,
    description: item.description?.trim() || undefined,
    priceCents: item.priceCents,
    priceText: item.priceText,
    section: item.section,
    course: courseEv,
    cuisine,
    archetype: archetype ? { id: archetype.id, label: archetype.label } : null,
    ingredients: [...ingredients.values()],
    flavors: [...flavors.values()],
    spice,
    groups,
    labels,
    excluded,
    completeness,
  };
}

export function enrichMenu(items: MenuItemInput[], opts: EnrichOptions = {}): EnrichedDish[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const dish = enrichDish(item, opts);
    // Keep keys unique when a menu repeats a name (e.g. same dish in two sections).
    const n = seen.get(dish.key) ?? 0;
    seen.set(dish.key, n + 1);
    return n === 0 ? dish : { ...dish, key: `${dish.key}-${n + 1}` };
  });
}

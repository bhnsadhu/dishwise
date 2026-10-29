/**
 * Controlled vocabulary shared by taste profiles, menu enrichment and ranking.
 * Every id here is stable: it is persisted in profiles and feedback snapshots.
 */

export const CUISINES = [
  { id: "italian", label: "Italian" },
  { id: "japanese", label: "Japanese" },
  { id: "chinese", label: "Chinese" },
  { id: "korean", label: "Korean" },
  { id: "thai", label: "Thai" },
  { id: "vietnamese", label: "Vietnamese" },
  { id: "indian", label: "Indian" },
  { id: "mexican", label: "Mexican" },
  { id: "mediterranean", label: "Mediterranean" },
  { id: "middle-eastern", label: "Middle Eastern" },
  { id: "french", label: "French" },
  { id: "american", label: "American" },
] as const;
export type CuisineId = (typeof CUISINES)[number]["id"];

/**
 * Cuisine neighbourhoods used for "you like X, this is close to X" partial credit.
 * Deliberately sparse — only pairings with strong shared technique/ingredients.
 */
export const CUISINE_NEIGHBOURS: Partial<Record<CuisineId, CuisineId[]>> = {
  italian: ["mediterranean", "french"],
  mediterranean: ["italian", "middle-eastern"],
  "middle-eastern": ["mediterranean", "indian"],
  japanese: ["korean", "chinese"],
  korean: ["japanese", "chinese"],
  chinese: ["japanese", "korean", "vietnamese"],
  thai: ["vietnamese"],
  vietnamese: ["thai", "chinese"],
  indian: ["middle-eastern"],
  french: ["italian"],
  mexican: ["american"],
  american: ["mexican"],
};

export const FLAVORS = [
  { id: "savory", label: "Savory" },
  { id: "umami", label: "Umami" },
  { id: "sweet", label: "Sweet" },
  { id: "tangy", label: "Tangy" },
  { id: "smoky", label: "Smoky" },
  { id: "herby", label: "Herby" },
  { id: "rich", label: "Rich" },
  { id: "fresh", label: "Fresh" },
  { id: "creamy", label: "Creamy" },
  { id: "crispy", label: "Crispy" },
  { id: "bitter", label: "Bitter" },
] as const;
export type FlavorId = (typeof FLAVORS)[number]["id"];

/** Allergen and diet-relevant groups an ingredient can belong to. */
export const GROUPS = [
  { id: "beef", label: "Beef" },
  { id: "pork", label: "Pork" },
  { id: "poultry", label: "Poultry" },
  { id: "lamb", label: "Lamb" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "dairy", label: "Dairy" },
  { id: "egg", label: "Egg" },
  { id: "gluten", label: "Gluten" },
  { id: "tree-nuts", label: "Tree nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soy", label: "Soy" },
  { id: "sesame", label: "Sesame" },
  { id: "alcohol", label: "Alcohol" },
  { id: "honey", label: "Honey" },
] as const;
export type GroupId = (typeof GROUPS)[number]["id"];

/** Groups a user can declare as a hard restriction (allergy, intolerance, religious, etc). */
export const RESTRICTABLE_GROUPS: GroupId[] = [
  "gluten",
  "dairy",
  "egg",
  "tree-nuts",
  "peanuts",
  "shellfish",
  "fish",
  "soy",
  "sesame",
  "pork",
  "beef",
  "alcohol",
];

export const DIETS = [
  { id: "none", label: "No set diet", excludes: [] },
  { id: "pescatarian", label: "Pescatarian", excludes: ["beef", "pork", "poultry", "lamb"] },
  {
    id: "vegetarian",
    label: "Vegetarian",
    excludes: ["beef", "pork", "poultry", "lamb", "fish", "shellfish"],
  },
  {
    id: "vegan",
    label: "Vegan",
    excludes: ["beef", "pork", "poultry", "lamb", "fish", "shellfish", "dairy", "egg", "honey"],
  },
] as const satisfies readonly { id: string; label: string; excludes: readonly GroupId[] }[];
export type DietId = (typeof DIETS)[number]["id"];

export const COURSES = ["starter", "main", "side", "dessert", "drink", "unknown"] as const;
export type Course = (typeof COURSES)[number];

/** 0 = no heat, 4 = very hot. */
export const SPICE_LEVELS = [
  { level: 0, label: "No heat" },
  { level: 1, label: "Mild" },
  { level: 2, label: "Medium" },
  { level: 3, label: "Hot" },
  { level: 4, label: "Very hot" },
] as const;
export type SpiceLevel = 0 | 1 | 2 | 3 | 4;

export const BUDGETS = [
  { id: "any", label: "Price doesn't matter" },
  { id: "value", label: "Keep it affordable" },
  { id: "moderate", label: "Middle of the menu" },
  { id: "splurge", label: "Happy to splurge" },
] as const;
export type BudgetId = (typeof BUDGETS)[number]["id"];

export const cuisineLabel = (id: CuisineId) => CUISINES.find((c) => c.id === id)?.label ?? id;
export const flavorLabel = (id: FlavorId) => FLAVORS.find((f) => f.id === id)?.label ?? id;
export const groupLabel = (id: GroupId) => GROUPS.find((g) => g.id === id)?.label ?? id;
export const dietExcludes = (id: DietId): readonly GroupId[] =>
  DIETS.find((d) => d.id === id)?.excludes ?? [];

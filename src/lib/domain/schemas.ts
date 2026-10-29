import { z } from "zod";
import {
  BUDGETS,
  COURSES,
  CUISINES,
  DIETS,
  FLAVORS,
  RESTRICTABLE_GROUPS,
  type CuisineId,
  type FlavorId,
  type GroupId,
} from "./vocab";
import { INGREDIENTS } from "./ingredients";

const ids = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

export const cuisineId = ids(CUISINES.map((c) => c.id) as CuisineId[]);
export const flavorId = ids(FLAVORS.map((f) => f.id) as FlavorId[]);
export const restrictableGroupId = ids(RESTRICTABLE_GROUPS as GroupId[]);
export const ingredientId = ids(INGREDIENTS.map((i) => i.id));
export const dietId = ids(DIETS.map((d) => d.id));
export const budgetId = ids(BUDGETS.map((b) => b.id));
export const course = z.enum(COURSES);
export const spiceLevel = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

/** A user's declared taste. Every field is optional in spirit: empty arrays / null mean "skipped". */
export const tasteProfileSchema = z.object({
  version: z.literal(1),
  cuisines: z.array(cuisineId).max(CUISINES.length).default([]),
  /** Free-text favourite dishes, e.g. "ramen", "tacos" — matched against dish names and archetypes. */
  favoriteFoods: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  likedIngredients: z.array(ingredientId).max(40).default([]),
  dislikedIngredients: z.array(ingredientId).max(40).default([]),
  likedFlavors: z.array(flavorId).max(FLAVORS.length).default([]),
  dislikedFlavors: z.array(flavorId).max(FLAVORS.length).default([]),
  /** null = not answered. */
  spiceTolerance: spiceLevel.nullable().default(null),
  diet: dietId.default("none"),
  /** Hard restrictions (allergies, intolerances, religious or ethical avoidances). */
  restrictions: z.array(restrictableGroupId).max(RESTRICTABLE_GROUPS.length).default([]),
  budget: budgetId.default("any"),
});
export type TasteProfile = z.infer<typeof tasteProfileSchema>;

export const emptyProfile = (): TasteProfile => tasteProfileSchema.parse({ version: 1 });

/** Raw menu item as entered by the user, OCR-confirmed, or loaded from a sample menu. */
export const menuItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).optional(),
  /** Price in minor units (cents). Absent when the menu shows no price or it could not be read. */
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  /** Free-form price text kept when it is not numeric, e.g. "MP" / "Market price". */
  priceText: z.string().trim().max(40).optional(),
  section: z.string().trim().max(80).optional(),
  /** Menu-declared cuisine, if the menu or user specified one. */
  cuisine: cuisineId.optional(),
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export const menuInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  cuisine: cuisineId.optional(),
  currency: z.string().length(3).default("USD"),
  items: z.array(menuItemInputSchema).min(1).max(250),
});
export type MenuInput = z.infer<typeof menuInputSchema>;

export const ratingValue = z.number().int().min(1).max(5);

/**
 * Attributes of a dish snapshotted at feedback time, so learning keeps working even after the
 * original menu is gone (guest menus are never stored server-side).
 */
export const dishSnapshotSchema = z.object({
  name: z.string().max(120),
  cuisine: cuisineId.optional(),
  course: course.optional(),
  archetype: z.string().max(40).optional(),
  ingredients: z.array(ingredientId).max(40),
  flavors: z.array(flavorId).max(FLAVORS.length),
  spice: spiceLevel.optional(),
  priceCents: z.number().int().min(0).optional(),
  menuTitle: z.string().max(120).optional(),
});
export type DishSnapshot = z.infer<typeof dishSnapshotSchema>;

export const feedbackSchema = z.object({
  dishKey: z.string().min(1).max(200),
  snapshot: dishSnapshotSchema,
  saved: z.boolean().default(false),
  tried: z.boolean().default(false),
  rating: ratingValue.nullable().default(null),
  updatedAt: z.string().datetime().optional(),
});
export type Feedback = z.infer<typeof feedbackSchema>;

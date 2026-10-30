import { emptyProfile, type TasteProfile } from "@/lib/domain/schemas";
import { enrichMenu } from "@/lib/menu/enrich";
import { sampleMenuById } from "@/lib/menu/samples";
import { recommend } from "./rank";

/** Clearly labelled example taste for the home demo card and the share image. */
export const EXAMPLE_TASTE: TasteProfile = { ...emptyProfile(), likedIngredients: ["pork", "mushroom", "egg"], likedFlavors: ["rich", "umami"], spiceTolerance: 1, restrictions: ["shellfish"] };
export const DEMO_MENU = "lantern-noodle-bar";

/** The demo menu ranked for the example taste (or the given one). */
export function demoRecommendation(profile: TasteProfile = EXAMPLE_TASTE, feedback: Parameters<typeof recommend>[2] = []) {
  const menu = sampleMenuById(DEMO_MENU)!;
  const dishes = enrichMenu(menu.items, { menuKey: menu.id, menuCuisine: menu.cuisine });
  return { menu, rec: recommend(dishes, profile, feedback) };
}

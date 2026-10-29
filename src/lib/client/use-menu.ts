"use client";

import { useMemo } from "react";
import type { CuisineId } from "@/lib/domain/vocab";
import type { MenuItemInput } from "@/lib/domain/schemas";
import { enrichMenu, type EnrichedDish } from "@/lib/menu/enrich";
import { sampleMenuById } from "@/lib/menu/samples";
import { recommend, type Recommendation } from "@/lib/reco/rank";
import { useStore } from "./store";

export interface ResolvedMenu {
  id: string;
  title: string;
  blurb?: string;
  cuisine?: CuisineId;
  items: MenuItemInput[];
  illustrative: boolean;
  source: "sample" | "scan" | "manual";
}

export function useResolvedMenu(id: string): ResolvedMenu | null | undefined {
  const { menus, hydrated } = useStore();
  return useMemo(() => {
    const sample = sampleMenuById(id);
    if (sample) return { id, title: sample.title, blurb: sample.blurb, cuisine: sample.cuisine, items: sample.items, illustrative: true, source: "sample" as const };
    if (!hydrated) return undefined;
    const local = menus.find((m) => m.id === id);
    return local ? { id, title: local.title, cuisine: local.cuisine, items: local.items, illustrative: false, source: local.source } : null;
  }, [id, menus, hydrated]);
}

/** Enrich + rank a menu against the current profile and feedback. Pure and fast (<5 ms for 250 dishes). */
export function useRecommendation(menu: ResolvedMenu | null | undefined): { dishes: EnrichedDish[]; rec: Recommendation } | null {
  const { profile, feedback } = useStore();
  const dishes = useMemo(() => (menu ? enrichMenu(menu.items, { menuKey: menu.id, menuCuisine: menu.cuisine }) : null), [menu]);
  return useMemo(() => (dishes ? { dishes, rec: recommend(dishes, profile, feedback) } : null), [dishes, profile, feedback]);
}

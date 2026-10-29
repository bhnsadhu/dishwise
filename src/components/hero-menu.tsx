"use client";

import { useMemo, useState } from "react";
import { DishSheet } from "@/components/dish-sheet";
import { MarkedMenu } from "@/components/marked-menu";
import { useStore } from "@/lib/client/store";
import { emptyProfile, type TasteProfile } from "@/lib/domain/schemas";
import { enrichMenu } from "@/lib/menu/enrich";
import { sampleMenuById } from "@/lib/menu/samples";
import { recommend } from "@/lib/reco/rank";

/** A clearly-labelled example taste, so first-time visitors see a marked-up menu immediately. */
export const EXAMPLE_TASTE: TasteProfile = {
  ...emptyProfile(),
  likedIngredients: ["mushroom", "cheese", "chili"],
  dislikedIngredients: ["olives"],
  likedFlavors: ["smoky", "rich"],
  spiceTolerance: 3,
  restrictions: ["tree-nuts"],
};

const MENU_ID = "nonna-fig";

export function HeroMenu() {
  const { profile, profileTouched, feedback, hydrated } = useStore();
  const [mine, setMine] = useState<boolean | null>(null);
  const useMine = mine ?? (hydrated && profileTouched);
  const menu = sampleMenuById(MENU_ID)!;
  const dishes = useMemo(() => enrichMenu(menu.items, { menuKey: menu.id, menuCuisine: menu.cuisine }), [menu]);
  const rec = useMemo(() => recommend(dishes, useMine ? profile : EXAMPLE_TASTE, useMine ? feedback : []), [dishes, useMine, profile, feedback]);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="paper-tilt-r">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-table-ink">
        <p className="font-hand text-[18px] text-table-ink/90">
          {useMine ? "marked for your taste" : "marked for an example taste: loves mushrooms, cheese & heat; avoids nuts"}
        </p>
        {hydrated && profileTouched && (
          <button type="button" className="text-sm underline underline-offset-4" onClick={() => setMine(!useMine)}>
            {useMine ? "Show the example" : "Show my taste"}
          </button>
        )}
      </div>
      <MarkedMenu
        key={String(useMine)}
        title={menu.title}
        blurb={menu.blurb}
        illustrative
        dishes={dishes}
        rec={rec}
        onSelect={useMine ? (d) => setSelected(d.key) : undefined}
      />
      <DishSheet ranked={rec.ranked.find((r) => r.dish.key === selected) ?? null} menuTitle={menu.title} onClose={() => setSelected(null)} />
    </div>
  );
}

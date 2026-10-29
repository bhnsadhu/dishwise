"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarkedMenu } from "@/components/marked-menu";
import { TasteCard } from "@/components/taste-card";
import { useStore } from "@/lib/client/store";
import { enrichMenu } from "@/lib/menu/enrich";
import { SAMPLE_MENUS } from "@/lib/menu/samples";
import { recommend } from "@/lib/reco/rank";

export function TastePage() {
  const { profile, feedback, profileTouched, resetProfile } = useStore();
  const [menuId, setMenuId] = useState(SAMPLE_MENUS[0].id);
  const [confirmReset, setConfirmReset] = useState(false);
  const menu = SAMPLE_MENUS.find((m) => m.id === menuId)!;
  const dishes = useMemo(() => enrichMenu(menu.items, { menuKey: menu.id, menuCuisine: menu.cuisine }), [menu]);
  const rec = useMemo(() => recommend(dishes, profile, feedback), [dishes, profile, feedback]);

  return (
    <div className="wrap grid items-start gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="paper paper-tilt-l" aria-labelledby="taste-h">
        <h1 id="taste-h" className="text-center font-display text-[38px] leading-none">
          Your taste
        </h1>
        <p className="kicker mt-2 text-center">Mark what you like. Skip anything. Change it any time.</p>
        <div className="mt-6">
          <TasteCard compactIngredients />
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-3 text-[15px]">
              Wipe the whole card?
              <button type="button" className="link-pen text-red-pen" onClick={() => { resetProfile(); setConfirmReset(false); }}>
                Yes, clear it
              </button>
              <button type="button" className="link-pen" onClick={() => setConfirmReset(false)}>
                Keep it
              </button>
            </span>
          ) : (
            <button type="button" className="link-pen text-[15px]" onClick={() => setConfirmReset(true)} disabled={!profileTouched}>
              Clear card
            </button>
          )}
          <Link href="/menus" className="tag-btn primary">
            Choose a menu →
          </Link>
        </div>
      </section>

      <section aria-label="Live preview" className="lg:sticky lg:top-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-table-ink">
          <p className="font-hand text-[18px]">watch it re-mark as you go</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only sm:not-sr-only">Preview menu</span>
            <select
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              className="min-h-10 rounded-sm border border-table-ink/40 bg-table-2 px-2 text-table-ink"
            >
              {SAMPLE_MENUS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <MarkedMenu title={menu.title} blurb={menu.blurb} illustrative dishes={dishes} rec={rec} animate={false} />
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DishSheet } from "@/components/dish-sheet";
import { MarkedMenu, commonReasons, marginReasons } from "@/components/marked-menu";
import { useRecommendation, useResolvedMenu } from "@/lib/client/use-menu";
import { useStore } from "@/lib/client/store";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const menu = useResolvedMenu(id);
  const result = useRecommendation(menu);
  const { profile, feedback } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  if (menu === undefined) return <p className="wrap pt-8 font-hand text-[20px] text-table-ink">reading the menu…</p>;
  if (menu === null || !result) {
    return (
      <div className="wrap pt-6">
        <div className="paper mx-auto max-w-xl text-center">
          <h1 className="font-display text-[32px]">Menu not found</h1>
          <p className="mt-2 text-muted">Menus you scan or type are kept on the device you made them on. This one isn&apos;t on this device, or it was removed.</p>
          <Link href="/menus" className="tag-btn mt-5">
            Open a menu
          </Link>
        </div>
      </div>
    );
  }

  const { dishes, rec } = result;
  const common = commonReasons(rec);
  const sel = rec.ranked.find((r) => r.dish.key === selected) ?? null;
  const ratedHere = feedback.filter((f) => f.rating !== null).length;
  const avoids = profile.restrictions.length > 0 || profile.diet !== "none";

  return (
    <div className="wrap grid gap-6 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3 text-table-ink">
        <Link href="/menus" className="underline-offset-4 hover:underline">
          ← Menus
        </Link>
        <p className="font-hand text-[18px]" role="status">
          {rec.stage === "cold-start" ? (
            <>
              no taste set yet, so this is ranked by what the menu itself signals ·{" "}
              <Link href="/taste" className="underline underline-offset-4">
                mark your taste
              </Link>
            </>
          ) : rec.stage === "learning" ? (
            `using your taste card + ${ratedHere} rating${ratedHere === 1 ? "" : "s"}`
          ) : (
            "ranked for your taste card · rate dishes to teach it more"
          )}
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <aside className="grid gap-5 lg:sticky lg:top-6" aria-label="Summary">
          <section className="paper paper-tilt-l" aria-labelledby="picks-h">
            <h2 id="picks-h" className="font-display text-[26px] leading-none">
              Order this
            </h2>
            <ol className="m-0 mt-3 grid list-none gap-3 p-0">
              {rec.picks.map((p, i) => (
                <li key={p.dish.key}>
                  <button type="button" onClick={() => setSelected(p.dish.key)} className="grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-baseline gap-2 text-left hover:text-pen">
                    <span className="font-hand text-[24px] leading-none text-pen">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-serif text-[17px] font-semibold leading-tight">{p.dish.name}</span>
                      <span className="block text-[14px] leading-snug text-muted">{marginReasons(p, 2, common).map((r) => r.text).join("; ") || "a solid choice here"}</span>
                    </span>
                    <span className="font-hand text-[20px] tabular-nums text-pen">{p.score}</span>
                  </button>
                </li>
              ))}
            </ol>
            {rec.picks.length === 0 && <p className="mt-2 text-muted">Nothing here fits what you avoid. Ask the staff what they can adapt.</p>}
          </section>

          {rec.heldBack.length > 0 && (
            <section className="paper" aria-labelledby="held-h">
              <h2 id="held-h" className="font-display text-[22px] leading-none text-red-pen">
                Held back ({rec.heldBack.length})
              </h2>
              <ul className="m-0 mt-2 grid list-none gap-1.5 p-0 text-[15px]">
                {rec.heldBack.map((h) => (
                  <li key={h.dish.key}>
                    <button type="button" onClick={() => setSelected(h.dish.key)} className="text-left hover:text-pen">
                      <span className="font-semibold">{h.dish.name}</span>{" "}
                      <span className="text-muted">{h.safety.status === "conflict" ? "(on the menu)" : "(usually)"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {avoids && (
            <p className="rounded-sm border border-table-ink/30 p-3 text-[14px] text-table-ink/85">
              Dishwise flags what this menu says and what dishes usually contain. It can&apos;t see the kitchen. If you have an allergy, confirm with the staff before ordering.
            </p>
          )}
        </aside>

        <MarkedMenu
          title={menu.title}
          blurb={menu.blurb}
          illustrative={menu.illustrative}
          dishes={dishes}
          rec={rec}
          onSelect={(d) => setSelected(d.key)}
        />
      </div>

      <DishSheet ranked={sel} menuTitle={menu.title} onClose={() => setSelected(null)} />
    </div>
  );
}

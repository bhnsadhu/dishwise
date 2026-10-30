"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useState } from "react";
import { CoverArt, coverGround } from "@/components/cover-art";
import { DishDialog } from "@/components/dish-dialog";
import { Icon } from "@/components/icons";
import { MatchPill, formatPrice, heldReason, isHeld } from "@/components/match";
import { useRecommendation, useResolvedMenu } from "@/lib/client/use-menu";
import { useStore } from "@/lib/client/store";
import { cuisineLabel } from "@/lib/domain/vocab";
import type { EnrichedDish } from "@/lib/menu/enrich";
import { dishMarks, highlight } from "@/lib/reco/marks";
import type { RankedDish } from "@/lib/reco/rank";
import { commonReasons, topReasons } from "@/lib/reco/reasons";
import { slugify } from "@/lib/text";

const sectionId = (s?: string) => `sec-${slugify(s ?? "dishes") || "dishes"}`;

function Described({ r }: { r: RankedDish }) {
  if (!r.dish.description) return null;
  const terms = dishMarks(r).terms.filter((t) => t.kind === "pos");
  return (
    <span className="line-clamp-2 text-[14px] leading-snug text-sub">
      {highlight(r.dish.description, terms).map((s, i) => (s.kind ? <span key={i} className="em">{s.text}</span> : <Fragment key={i}>{s.text}</Fragment>))}
    </span>
  );
}

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const menu = useResolvedMenu(id);
  const result = useRecommendation(menu);
  const { profileTouched, feedback, profile } = useStore();
  const [selected, setSelected] = useState<string | null>(null);

  if (menu === undefined) return <p className="page pt-10 text-sub">Reading the menu…</p>;
  if (menu === null || !result) {
    return (
      <div className="page pt-10">
        <div className="card mx-auto grid max-w-lg justify-items-center gap-3 p-8 text-center">
          <h1 className="text-2xl font-extrabold">Menu not found</h1>
          <p className="text-sub">Menus you scan or type are kept on the device you made them on. This one isn&apos;t on this device, or it was removed.</p>
          <Link href="/" className="btn btn-primary mt-2">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const { dishes, rec } = result;
  const common = commonReasons(rec);
  const byKey = new Map(rec.ranked.map((r) => [r.dish.key, r]));
  const sel = rec.ranked.find((r) => r.dish.key === selected) ?? null;
  const ratedCount = feedback.filter((f) => f.rating !== null).length;
  const avoids = profile.restrictions.length > 0 || profile.diet !== "none";

  const groups: { section?: string; dishes: EnrichedDish[] }[] = [];
  for (const d of dishes) {
    const last = groups.at(-1);
    if (last && last.section === d.section) last.dishes.push(d);
    else groups.push({ section: d.section, dishes: [d] });
  }

  const reasonLine = (r: RankedDish) => topReasons(r, 2, common).map((x) => x.text).join(" · ");

  const picksPanel = (place: "inline" | "side") => (
    <section aria-labelledby={`picks-${place}`} className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id={`picks-${place}`} className="scroll-mt-24 text-[20px] font-extrabold tracking-[-0.015em]">
          Top picks for you
        </h2>
        <span className="text-sm text-sub">{rec.stage === "learning" ? `Using ${ratedCount} rating${ratedCount === 1 ? "" : "s"}` : rec.stage === "profile" ? "From your taste" : "From the menu"}</span>
      </div>
      {rec.picks.length === 0 ? (
        <p className="card p-4 text-sub">Nothing here fits what you avoid. Ask the staff what they can adapt.</p>
      ) : (
        <ol className="rail -mx-4 lg:mx-0 lg:grid lg:gap-2.5 lg:overflow-visible lg:px-0">
          {rec.picks.map((p, i) => (
            <li key={p.dish.key} className="w-[244px] lg:w-auto">
              <button
                type="button"
                onClick={() => setSelected(p.dish.key)}
                className="card grid h-full w-full gap-1.5 p-4 text-left shadow-[var(--shadow)] transition-transform hover:-translate-y-0.5 lg:grid-cols-[28px_1fr_auto] lg:items-start lg:gap-x-3 lg:shadow-none"
              >
                <span className="text-[13px] font-extrabold text-sub lg:pt-0.5">#{i + 1}</span>
                <span className="grid gap-1 lg:col-start-2">
                  <span className="text-[16px] font-bold leading-snug">{p.dish.name}</span>
                  <span className="text-[13.5px] leading-snug text-sub">{reasonLine(p) || "A solid choice here"}</span>
                  <span className="text-[14px] font-semibold tabular-nums">{formatPrice(p.dish.priceCents, p.dish.priceText)}</span>
                </span>
                <span className="order-first justify-self-end lg:order-none lg:col-start-3 lg:row-start-1">
                  <MatchPill r={p} long />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  return (
    <div className="page pt-3 md:pt-6">
      <div className="relative grid h-40 place-items-center overflow-hidden rounded-[22px] md:h-56" style={{ background: coverGround(menu.cuisine) }}>
        <CoverArt cuisine={menu.cuisine} className="h-[88%] w-auto" />
        <Link href="/" className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-card text-ink shadow-md md:hidden" aria-label="Back to home">
          <Icon name="back" size={20} />
        </Link>
      </div>

      <header className="mt-4 grid gap-2 md:mt-6">
        <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.025em] md:text-[38px]">{menu.title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-sub">
          {menu.cuisine && <span>{cuisineLabel(menu.cuisine)}</span>}
          {menu.cuisine && <span aria-hidden="true">·</span>}
          <span>{dishes.length} dishes</span>
          {menu.illustrative && (
            <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[12.5px] font-semibold text-warn">Sample menu · fictional restaurant</span>
          )}
          {!menu.illustrative && <span className="rounded-md bg-surf px-2 py-0.5 text-[12.5px] font-semibold">{menu.source === "scan" ? "Scanned" : "Typed"} on this device</span>}
        </p>
        {!profileTouched && rec.stage === "cold-start" && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-soft p-4">
            <p className="text-[15px]">
              <b>Picks are based on the menu alone.</b> Tell Dishwise what you like and they&apos;ll be about you.
            </p>
            <Link href="/taste" className="btn btn-primary btn-sm">
              Set your taste
            </Link>
          </div>
        )}
      </header>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[180px_minmax(0,1fr)_320px]">
        <nav aria-label="Menu sections" className="sticky top-20 hidden lg:grid lg:gap-1">
          <a href="#picks-side" className="rounded-xl px-3 py-2 text-[15px] font-semibold text-sub hover:bg-surf hover:text-ink">
            Top picks
          </a>
          {groups.map((g, i) => (
            <a key={i} href={`#${sectionId(g.section)}`} className="rounded-xl px-3 py-2 text-[15px] font-semibold text-sub hover:bg-surf hover:text-ink">
              {g.section ?? "Dishes"}
            </a>
          ))}
        </nav>

        <div className="min-w-0">
          <div className="lg:hidden">{picksPanel("inline")}</div>

          <div className="sticky top-0 z-20 -mx-4 mt-6 border-b border-line bg-bg/95 px-4 backdrop-blur-md md:top-16 lg:hidden">
            <div className="rail -mx-4 py-2.5">
              {groups.map((g, i) => (
                <a key={i} href={`#${sectionId(g.section)}`} className="chip">
                  {g.section ?? "Dishes"}
                </a>
              ))}
            </div>
          </div>

          {groups.map((g, gi) => (
            <section key={gi} aria-labelledby={sectionId(g.section)} className="mt-7 scroll-mt-32 first:mt-6 lg:first:mt-0">
              <h2 id={sectionId(g.section)} className="scroll-mt-32 text-[21px] font-extrabold tracking-[-0.015em]">
                {g.section ?? "Dishes"}
              </h2>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {g.dishes.map((d) => {
                  const r = byKey.get(d.key)!;
                  const held = isHeld(r);
                  const reason = reasonLine(r);
                  return (
                    <li key={d.key}>
                      <div className="card relative grid h-full w-full gap-1.5 p-4 text-left transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[var(--shadow)]">
                        <span className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelected(d.key)}
                            aria-label={`${d.name}. ${held ? "Held back" : `Score ${r.score}`}. Show why.`}
                            className={`stretch text-left text-[16px] font-bold leading-snug ${held ? "text-sub" : ""}`}
                          >
                            {d.name}
                          </button>
                          <MatchPill r={r} />
                        </span>
                        <Described r={r} />
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
                          <span className="font-semibold tabular-nums">{formatPrice(d.priceCents, d.priceText)}</span>
                          {held ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-no-soft px-2 py-0.5 text-[12.5px] font-bold text-no">
                              <Icon name="alert" size={14} />
                              {heldReason(r)}
                            </span>
                          ) : (
                            reason && <span className="text-[13px] font-medium text-ok">{reason}</span>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside className="sticky top-20 hidden gap-6 lg:grid" aria-label="Your picks">
          {picksPanel("side")}
          {rec.heldBack.length > 0 && (
            <section aria-labelledby="held-h" className="card grid gap-2 p-4">
              <h2 id="held-h" className="flex items-center gap-2 text-[16px] font-extrabold text-no">
                <Icon name="alert" size={18} />
                Held back ({rec.heldBack.length})
              </h2>
              <ul className="grid gap-1 text-[14.5px]">
                {rec.heldBack.map((h) => (
                  <li key={h.dish.key}>
                    <button type="button" className="text-left hover:underline" onClick={() => setSelected(h.dish.key)}>
                      <b>{h.dish.name}</b> <span className="text-sub">· {heldReason(h)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {avoids && (
            <p className="flex gap-2 rounded-2xl bg-warn-soft p-4 text-[13.5px] text-warn">
              <Icon name="alert" size={18} className="mt-0.5" />
              Dishwise flags what this menu says and what dishes usually contain. It can&apos;t see the kitchen. If you have an allergy, confirm with the staff before ordering.
            </p>
          )}
        </aside>
      </div>

      {avoids && (
        <p className="mt-6 flex gap-2 rounded-2xl bg-warn-soft p-4 text-[13.5px] text-warn lg:hidden">
          <Icon name="alert" size={18} className="mt-0.5" />
          Dishwise flags what this menu says and what dishes usually contain. It can&apos;t see the kitchen. If you have an allergy, confirm with the staff before ordering.
        </p>
      )}

      <DishDialog ranked={sel} total={dishes.length} menuTitle={menu.title} cuisine={menu.cuisine} onClose={() => setSelected(null)} />
    </div>
  );
}

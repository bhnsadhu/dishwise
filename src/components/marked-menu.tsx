"use client";

import { Fragment } from "react";
import type { EnrichedDish } from "@/lib/menu/enrich";
import { dishMarks, highlight, type Segment } from "@/lib/reco/marks";
import type { RankedDish, Recommendation } from "@/lib/reco/rank";
import { PenCircle, PenStrike } from "./pen";

export const formatPrice = (cents?: number, text?: string) =>
  cents !== undefined ? (cents / 100).toFixed(cents % 100 ? 2 : 0) : (text ?? "");

const isHeld = (r: RankedDish) => r.safety.status === "conflict" || r.safety.status === "likely-conflict";

function Marked({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.kind ? (
          <span key={i} className={`mk mk-${s.kind}`}>
            {s.text}
          </span>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Reasons that apply to nearly every dish on this menu (e.g. its cuisine) don't help you choose. */
export function commonReasons(rec: Recommendation): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rec.ranked) for (const t of new Set(r.contributions.map((c) => c.text))) counts.set(t, (counts.get(t) ?? 0) + 1);
  const n = rec.ranked.length;
  return new Set([...counts].filter(([, c]) => n >= 4 && c / n >= 0.8).map(([t]) => t));
}

const PROPER = /^(Italian|Japanese|Chinese|Korean|Thai|Vietnamese|Indian|Mexican|Mediterranean|Middle Eastern|French|American|Similar to|You )/;
const sentenceCase = (t: string) => (PROPER.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

/** The top 1–2 distinguishing reasons, phrased for the margin. Menu-position signals only if nothing else. */
export function marginReasons(r: RankedDish, n = 2, skip: Set<string> = new Set()): { text: string; inferred: boolean }[] {
  const positive = r.contributions.filter((c) => c.points > 0 && !skip.has(c.text));
  const real = positive.filter((c) => c.kind !== "menu-signal");
  return (real.length ? real : positive).slice(0, n).map((c) => ({ text: sentenceCase(c.text), inferred: c.basis === "inferred" }));
}

export function MarkedMenu({
  title,
  blurb,
  illustrative,
  dishes,
  rec,
  onSelect,
  animate = true,
  topN = 3,
}: {
  title: string;
  blurb?: string;
  illustrative?: boolean;
  dishes: EnrichedDish[];
  rec: Recommendation;
  onSelect?: (dish: EnrichedDish) => void;
  animate?: boolean;
  topN?: number;
}) {
  const byKey = new Map(rec.ranked.map((r) => [r.dish.key, r]));
  const pickRank = new Map(rec.picks.slice(0, topN).map((p, i) => [p.dish.key, i + 1]));
  const common = commonReasons(rec);

  // Group consecutive dishes by section, as printed.
  const groups: { section?: string; dishes: EnrichedDish[] }[] = [];
  for (const d of dishes) {
    const last = groups.at(-1);
    if (last && last.section === d.section) last.dishes.push(d);
    else groups.push({ section: d.section, dishes: [d] });
  }

  return (
    <article className="paper" aria-label={`${title} menu, marked up for you`}>
      <header className="text-center">
        <h2 className="font-display text-[clamp(30px,4.4vw,44px)] leading-none text-balance">{title}</h2>
        {blurb && <p className="kicker mt-2">{blurb}</p>}
        {illustrative && <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">Illustrative menu · fictional restaurant</p>}
      </header>

      {groups.map((g, gi) => (
        <section key={gi} aria-label={g.section ?? "Dishes"}>
          {g.section && <h3 className="sec">{g.section}</h3>}
          <ul className="m-0 list-none p-0">
            {g.dishes.map((d) => {
              const r = byKey.get(d.key)!;
              const held = isHeld(r);
              const rank = pickRank.get(d.key);
              const marks = dishMarks(r);
              const variety =
                rank !== undefined &&
                rec.ranked.some((o) => o.score > r.score && !pickRank.has(o.dish.key) && !isHeld(o) && o.dish.course?.value !== "drink");
              const reasons = marginReasons(r, 2, common);
              return (
                <li key={d.key} className="grid grid-cols-[46px_minmax(0,1fr)_auto] gap-x-3 py-2.5">
                  <div
                    className={`pt-0.5 text-right font-hand tabular-nums leading-none ${held ? "text-[22px] text-red-pen" : rank ? "text-[24px] text-pen" : r.score < 55 ? "text-[17px] text-muted" : "text-[20px] text-pen"}`}
                    aria-hidden="true"
                  >
                    {held ? "✕" : r.score}
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelect?.(d)}
                      className={`relative inline text-left font-serif text-[18px] font-semibold leading-snug ${held ? "text-muted" : ""} ${onSelect ? "cursor-pointer hover:text-pen" : "cursor-default"}`}
                      aria-label={`${d.name}. ${held ? "Held back" : `Score ${r.score}${rank ? `, pick number ${rank}` : ""}`}. Show why.`}
                    >
                      <span className="relative inline-block">
                        <Marked segments={highlight(d.name, marks.terms)} />
                        {rank && <PenCircle animate={animate} />}
                        {held && <PenStrike animate={animate} />}
                      </span>
                    </button>
                    {d.description && (
                      <p className="mt-0.5 text-[15px] italic leading-snug text-muted">
                        <Marked segments={highlight(d.description, marks.terms)} />
                      </p>
                    )}
                  </div>
                  <div className="text-right font-serif text-base tabular-nums">{formatPrice(d.priceCents, d.priceText)}</div>

                  {held ? (
                    <p className="col-start-2 col-end-4 mt-1 font-hand text-[18px] leading-tight text-red-pen">{r.safety.notes[0]}</p>
                  ) : rank ? (
                    <p className="col-start-2 col-end-4 mt-1 font-hand text-[18px] leading-tight text-pen">
                      #{rank} —{" "}
                      {reasons.length === 0 && (variety ? "picked for variety" : "a solid choice here")}
                      {reasons.map((x, i) => (
                        <Fragment key={i}>
                          {i > 0 && "; "}
                          <span className={x.inferred ? "mk-inf" : ""}>{x.text}</span>
                        </Fragment>
                      ))}
                      {variety && reasons.length > 0 && "; picked for variety"}
                    </p>
                  ) : marks.inferred.length > 0 && marks.inferred[0].points > 0 ? (
                    <p className="col-start-2 col-end-4 mt-0.5 font-hand text-[17px] leading-tight text-pen">
                      <span className="mk-inf">{marks.inferred[0].text.toLowerCase()}</span>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <footer className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 border-t border-rule pt-3 text-[13px] text-muted">
        <span><span className="mk mk-pos">solid</span> on the menu</span>
        <span><span className="mk-inf">dotted</span> typical recipe</span>
        <span><span className="mk mk-neg">wavy</span> you dislike</span>
        <span><span className="mk mk-bad">struck</span> conflicts with what you avoid</span>
        <span>margin: 0–100 match</span>
      </footer>
    </article>
  );
}

"use client";

import { Fragment, useEffect, useRef } from "react";
import { useStore } from "@/lib/client/store";
import type { CuisineId } from "@/lib/domain/vocab";
import { dishMarks, highlight } from "@/lib/reco/marks";
import type { RankedDish } from "@/lib/reco/rank";
import type { Contribution } from "@/lib/reco/score";
import { CoverArt, coverGround } from "./cover-art";
import { Icon } from "./icons";
import { formatPrice, isHeld } from "./match";
import { Stars } from "./stars";

const BASIS: Record<Contribution["basis"], string> = { stated: "On menu", inferred: "Typical recipe", you: "Your ratings", menu: "Menu" };

const CONFIDENCE = {
  high: "The menu says a lot about this dish.",
  medium: "Some of this comes from typical recipes.",
  low: "The menu says very little, so treat this as a rough guess.",
};

/** Dish details: a bottom sheet on phones, a centred dialog on larger screens. Native <dialog>: Esc closes, focus is trapped. */
export function DishDialog({ ranked, total, menuTitle, cuisine, onClose }: { ranked: RankedDish | null; total: number; menuTitle: string; cuisine?: CuisineId; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { feedbackFor, updateFeedback } = useStore();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ranked && !d.open) d.showModal();
    if (!ranked && d.open) d.close();
  }, [ranked]);

  const fb = ranked ? feedbackFor(ranked.dish.key) : undefined;
  const held = ranked ? isHeld(ranked) : false;
  const terms = ranked ? dishMarks(ranked).terms.filter((t) => t.kind === "pos") : [];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="dish-title"
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[26px] bg-card p-0 text-ink shadow-2xl backdrop:bg-[var(--scrim)] open:animate-[sheet-up_.34s_cubic-bezier(.16,1,.3,1)] md:inset-0 md:m-auto md:max-h-[86dvh] md:w-[min(600px,calc(100vw-48px))] md:rounded-[24px]"
    >
      {ranked && (
        <div className="max-h-[inherit] overflow-y-auto">
          <div className="relative grid h-32 place-items-center md:h-40" style={{ background: coverGround(cuisine) }}>
            <CoverArt cuisine={cuisine} className="h-[86%] w-auto" />
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-card text-ink shadow-md"
              aria-label="Close"
            >
              <Icon name="x" size={20} />
            </button>
            <span className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-black/15 md:hidden" aria-hidden="true" />
          </div>

          <div className="grid gap-5 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 md:px-7 md:pb-7">
            <div>
              <h2 id="dish-title" className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-balance">
                {ranked.dish.name}
              </h2>
              <p className="mt-1 text-[15px] text-sub">{[formatPrice(ranked.dish.priceCents, ranked.dish.priceText), ranked.dish.section, menuTitle].filter(Boolean).join(" · ")}</p>
              {ranked.dish.description && (
                <p className="mt-2 text-[15px] leading-relaxed text-sub">
                  {highlight(ranked.dish.description, terms).map((s, i) => (s.kind ? <span key={i} className="em">{s.text}</span> : <Fragment key={i}>{s.text}</Fragment>))}
                </p>
              )}
            </div>

            <div className={`grid grid-cols-[auto_1fr] items-center gap-x-4 rounded-2xl p-4 ${held ? "bg-no-soft" : ranked.score >= 70 ? "bg-ok-soft" : "bg-surf"}`}>
              <b className={`row-span-2 text-[38px] font-black leading-none tabular-nums tracking-[-0.03em] ${held ? "text-no" : ranked.score >= 70 ? "text-ok" : "text-ink"}`} aria-label={`Score ${ranked.score} out of 100`}>
                {held ? <Icon name="alert" size={34} /> : `${ranked.score}%`}
              </b>
              <span className="font-bold">{held ? "Held back for you" : "match for your taste"}</span>
              <span className="text-sm text-sub">
                #{ranked.rank} of {total} on this menu
              </span>
            </div>

            <section aria-labelledby="why-h">
              <h3 id="why-h" className="text-[17px] font-extrabold">
                Why this score
              </h3>
              {ranked.contributions.length === 0 ? (
                <p className="mt-2 text-sub">Nothing on your taste profile or in your ratings touches this dish, so it sits at the midpoint.</p>
              ) : (
                <ul className="mt-3 grid gap-2.5">
                  {ranked.contributions.map((c, i) => (
                    <li key={i} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                      <span className={`grid h-7 w-7 place-items-center rounded-full ${c.points > 0 ? "bg-ok-soft text-ok" : "bg-no-soft text-no"}`} aria-hidden="true">
                        <Icon name={c.points > 0 ? "check" : "x"} size={16} />
                      </span>
                      <span className="text-[15px]">
                        {c.text}
                        <span className="sr-only">
                          {" "}
                          ({c.points > 0 ? "+" : ""}
                          {c.points} points, {BASIS[c.basis]})
                        </span>
                      </span>
                      <span className="flex items-center gap-2" aria-hidden="true">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[11.5px] font-semibold text-sub ${c.basis === "inferred" ? "border-dashed border-sub/50" : "border-line"}`}>{BASIS[c.basis]}</span>
                        <span className={`w-9 text-right text-[13px] font-bold tabular-nums ${c.points > 0 ? "text-ok" : "text-no"}`}>
                          {c.points > 0 ? "+" : "−"}
                          {Math.abs(c.points)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[13.5px] text-sub">
                Points add up, then fold into a 0–100 match (0 points is 50%). It&apos;s a ranking, not a promise you&apos;ll love it. {CONFIDENCE[ranked.confidence]}
              </p>
            </section>

            {(ranked.safety.notes.length > 0 || ranked.unknowns.length > 0) && (
              <div className={`grid gap-1.5 rounded-2xl p-4 text-[14px] ${held ? "bg-no-soft text-no" : "bg-warn-soft text-warn"}`}>
                {ranked.safety.notes.map((n, i) => (
                  <p key={`s${i}`} className="flex gap-2">
                    <Icon name="alert" size={18} className="mt-0.5" />
                    {n}
                  </p>
                ))}
                {ranked.unknowns.map((u, i) => (
                  <p key={`u${i}`} className="flex gap-2">
                    <Icon name="info" size={18} className="mt-0.5" />
                    {u}.
                  </p>
                ))}
              </div>
            )}

            <section aria-labelledby="rate-h" className="grid gap-3 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="rate-h" className="text-[17px] font-extrabold">
                  Tried it?
                </h3>
                <Stars value={fb?.rating ?? null} onChange={(rating) => updateFeedback(ranked.dish, { rating }, menuTitle)} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" className="btn btn-secondary" aria-pressed={!!fb?.saved} onClick={() => updateFeedback(ranked.dish, { saved: !fb?.saved }, menuTitle)}>
                  <Icon name="heart" size={19} className={fb?.saved ? "fill-current text-no" : ""} />
                  {fb?.saved ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-pressed={!!fb?.tried}
                  onClick={() => updateFeedback(ranked.dish, { tried: !fb?.tried, rating: fb?.tried ? null : (fb?.rating ?? null) }, menuTitle)}
                >
                  <Icon name="check" size={19} />
                  {fb?.tried ? "Tried" : "Mark tried"}
                </button>
              </div>
              <p className="text-[13.5px] text-sub">Ratings change what Dishwise suggests next, on this menu and others.</p>
            </section>
          </div>
        </div>
      )}
    </dialog>
  );
}

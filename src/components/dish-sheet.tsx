"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/client/store";
import type { RankedDish } from "@/lib/reco/rank";
import type { Contribution } from "@/lib/reco/score";
import { formatPrice } from "./marked-menu";
import { Stars } from "./stars";

const BASIS: Record<Contribution["basis"], string> = {
  stated: "on the menu",
  inferred: "typical recipe",
  you: "your ratings",
  menu: "menu context",
};

const CONFIDENCE = {
  high: "The menu says a lot about this dish.",
  medium: "Some of this comes from typical recipes.",
  low: "The menu says very little, so treat this as a rough guess.",
};

/** Full evidence for one dish, plus save / tried / rate. A native modal dialog (Esc closes, focus is trapped). */
export function DishSheet({ ranked, menuTitle, onClose }: { ranked: RankedDish | null; menuTitle: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { feedbackFor, updateFeedback } = useStore();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ranked && !d.open) d.showModal();
    if (!ranked && d.open) d.close();
  }, [ranked]);

  const fb = ranked ? feedbackFor(ranked.dish.key) : undefined;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="dish-sheet-title"
      className="m-auto w-[min(560px,calc(100vw-24px))] max-h-[min(88dvh,820px)] bg-transparent p-0 backdrop:bg-black/55"
    >
      {ranked && (
        <div className="paper relative max-h-[inherit] overflow-y-auto">
          <button type="button" onClick={() => ref.current?.close()} className="absolute right-3 top-2 grid h-10 w-10 place-items-center font-hand text-2xl text-muted hover:text-pen" aria-label="Close">
            ×
          </button>
          <div className="flex items-start gap-4 pr-8">
            <div className="font-hand text-[56px] leading-none tabular-nums text-pen" aria-label={`Score ${ranked.score} out of 100`}>
              {ranked.score}
            </div>
            <div className="min-w-0">
              <h2 id="dish-sheet-title" className="font-display text-[28px] leading-tight text-balance">
                {ranked.dish.name}
              </h2>
              <p className="text-sm text-muted">
                {[formatPrice(ranked.dish.priceCents, ranked.dish.priceText), ranked.dish.section, `#${ranked.rank} on this menu`].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {ranked.dish.description && <p className="mt-3 italic text-muted">{ranked.dish.description}</p>}

          <h3 className="sec">Why this score</h3>
          {ranked.contributions.length === 0 ? (
            <p className="text-muted">Nothing on your taste card or in your ratings touches this dish, so it sits at the midpoint.</p>
          ) : (
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {ranked.contributions.map((c, i) => (
                <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)] items-baseline gap-2">
                  <span className={`text-right font-hand text-lg tabular-nums ${c.points > 0 ? "text-pen" : "text-red-pen"}`}>
                    {c.points > 0 ? "+" : "−"}
                    {Math.abs(c.points)}
                  </span>
                  <span>
                    <span className={c.basis === "inferred" ? "mk-inf" : ""}>{c.text}</span>
                    <span className="ml-2 text-xs uppercase tracking-[0.08em] text-muted">{BASIS[c.basis]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-muted">
            Points add up, then fold into a 0–100 match (0 points = 50). It&apos;s a ranking, not a guarantee you&apos;ll love it. {CONFIDENCE[ranked.confidence]}
          </p>

          {(ranked.safety.notes.length > 0 || ranked.unknowns.length > 0) && (
            <>
              <h3 className="sec">Worth knowing</h3>
              <ul className="m-0 grid list-none gap-1 p-0 text-[15px]">
                {ranked.safety.notes.map((n, i) => (
                  <li key={`s${i}`} className={ranked.safety.status === "conflict" || ranked.safety.status === "likely-conflict" ? "text-red-pen" : ""}>
                    {n}
                  </li>
                ))}
                {ranked.unknowns.map((u, i) => (
                  <li key={`u${i}`} className="text-muted">
                    {u}.
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className="sec">Tried it?</h3>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Stars value={fb?.rating ?? null} onChange={(rating) => updateFeedback(ranked.dish, { rating }, menuTitle)} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="tag-btn"
                aria-pressed={!!fb?.tried}
                onClick={() => updateFeedback(ranked.dish, { tried: !fb?.tried, rating: fb?.tried ? null : (fb?.rating ?? null) }, menuTitle)}
              >
                {fb?.tried ? "✓ Tried" : "Mark tried"}
              </button>
              <button type="button" className="tag-btn" aria-pressed={!!fb?.saved} onClick={() => updateFeedback(ranked.dish, { saved: !fb?.saved }, menuTitle)}>
                {fb?.saved ? "♥ Saved" : "♡ Save"}
              </button>
            </div>
          </div>
          <p className="mt-2 font-hand text-[17px] text-pen">Ratings change what Dishwise suggests next, here and on other menus.</p>
        </div>
      )}
    </dialog>
  );
}

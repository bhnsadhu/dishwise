"use client";

import Link from "next/link";
import { Stars } from "@/components/stars";
import { useStore } from "@/lib/client/store";
import type { Feedback } from "@/lib/domain/schemas";
import { cuisineLabel } from "@/lib/domain/vocab";
import { enrichDish } from "@/lib/menu/enrich";

/** Rebuild a minimal dish from its snapshot so ratings can be edited without the original menu. */
const dishFrom = (f: Feedback) => ({ ...enrichDish({ name: f.snapshot.name }), key: f.dishKey });

function Entry({ f }: { f: Feedback }) {
  const { updateFeedback, removeFeedback } = useStore();
  const d = dishFrom(f);
  return (
    <li className="grid gap-x-4 gap-y-1 border-b border-rule py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="font-serif text-[18px] font-semibold leading-tight">
          {f.saved && <span className="mr-1 text-pen" aria-label="Saved">♥</span>}
          {f.snapshot.name}
        </p>
        <p className="text-sm text-muted">{[f.snapshot.menuTitle, f.snapshot.cuisine && cuisineLabel(f.snapshot.cuisine), f.tried ? "tried" : null].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Stars size="sm" value={f.rating} onChange={(rating) => updateFeedback(d, { rating })} label={`Rating for ${f.snapshot.name}`} />
        <button type="button" className="link-pen text-sm" onClick={() => updateFeedback(d, { saved: !f.saved })}>
          {f.saved ? "unsave" : "save"}
        </button>
        <button type="button" className="link-pen text-sm text-muted" onClick={() => removeFeedback(f.dishKey)} aria-label={`Forget ${f.snapshot.name}`}>
          forget
        </button>
      </div>
    </li>
  );
}

export function NotebookPage() {
  const { feedback, hydrated, account } = useStore();
  const saved = feedback.filter((f) => f.saved);
  const rated = feedback.filter((f) => f.rating !== null || f.tried);
  return (
    <div className="wrap grid gap-8 pt-4">
      <header className="text-table-ink">
        <h1 className="font-display text-[clamp(40px,6vw,64px)] leading-none">Notebook</h1>
        <p className="mt-3 max-w-[56ch] text-[18px] text-table-ink/85">
          Dishes you saved or rated. Ratings teach Dishwise what you like, and every menu you open is ranked with them.
          {account.status === "guest" && (
            <>
              {" "}
              Stored on this device.{" "}
              <Link href="/account" className="underline underline-offset-4">
                Sign in
              </Link>{" "}
              to keep them everywhere.
            </>
          )}
        </p>
      </header>

      {hydrated && feedback.length === 0 ? (
        <div className="paper mx-auto max-w-xl text-center">
          <p className="font-hand text-[22px] text-pen">nothing here yet</p>
          <p className="mt-2 text-muted">Open a menu, tap a dish, and rate it or save it. It lands here.</p>
          <Link href="/menus" className="tag-btn mt-4">
            Open a menu
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="paper paper-tilt-l" aria-labelledby="saved-h">
            <h2 id="saved-h" className="font-display text-[28px]">
              Saved <span className="font-hand text-[22px] text-pen">{saved.length}</span>
            </h2>
            {saved.length ? <ul className="m-0 list-none p-0">{saved.map((f) => <Entry key={f.dishKey} f={f} />)}</ul> : <p className="mt-2 text-muted">Tap ♡ Save on a dish to keep it here.</p>}
          </section>
          <section className="paper paper-tilt-r" aria-labelledby="rated-h">
            <h2 id="rated-h" className="font-display text-[28px]">
              Tried &amp; rated <span className="font-hand text-[22px] text-pen">{rated.length}</span>
            </h2>
            {rated.length ? <ul className="m-0 list-none p-0">{rated.map((f) => <Entry key={f.dishKey} f={f} />)}</ul> : <p className="mt-2 text-muted">Rate a dish after you try it and the next menu gets smarter.</p>}
          </section>
        </div>
      )}
    </div>
  );
}

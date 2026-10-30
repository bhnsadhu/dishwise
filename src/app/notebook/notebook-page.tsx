"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
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
    <li className="grid gap-x-4 gap-y-2 border-b border-line py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[16.5px] font-bold leading-tight">
          {f.saved && <Icon name="heart" size={17} className="fill-current text-no" label="Saved" />}
          {f.snapshot.name}
        </p>
        <p className="text-[14px] text-sub">{[f.snapshot.menuTitle, f.snapshot.cuisine && cuisineLabel(f.snapshot.cuisine), f.tried ? "tried" : null].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Stars size="sm" value={f.rating} onChange={(rating) => updateFeedback(d, { rating })} label={`Rating for ${f.snapshot.name}`} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateFeedback(d, { saved: !f.saved })}>
          {f.saved ? "Unsave" : "Save"}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeFeedback(f.dishKey)} aria-label={`Forget ${f.snapshot.name}`}>
          <Icon name="trash" size={16} />
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
    <div className="page grid gap-6 pt-4 md:pt-8">
      <header className="grid gap-1">
        <h1 className="text-[30px] font-black tracking-[-0.03em] md:text-[40px]">Saved</h1>
        <p className="max-w-[60ch] text-[16px] text-sub">
          Dishes you saved or rated. Ratings teach Dishwise what you like, so every menu you open is ranked with them.
          {account.status === "guest" && (
            <>
              {" "}
              Stored on this device.{" "}
              <Link href="/account" className="link">
                Sign in
              </Link>{" "}
              to keep them everywhere.
            </>
          )}
        </p>
      </header>

      {hydrated && feedback.length === 0 ? (
        <div className="card mx-auto grid w-full max-w-lg justify-items-center gap-3 p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-text">
            <Icon name="heart" size={26} />
          </span>
          <p className="text-[18px] font-bold">Nothing here yet</p>
          <p className="text-sub">Open a menu, tap a dish, and rate or save it. It lands here.</p>
          <Link href="/" className="btn btn-primary mt-1">
            Find something to order
          </Link>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="saved-h" className="card p-5">
            <h2 id="saved-h" className="text-[20px] font-extrabold">
              Saved dishes <span className="text-sub">{saved.length}</span>
            </h2>
            {saved.length ? <ul>{saved.map((f) => <Entry key={f.dishKey} f={f} />)}</ul> : <p className="mt-2 text-sub">Tap Save on a dish to keep it here.</p>}
          </section>
          <section aria-labelledby="rated-h" className="card p-5">
            <h2 id="rated-h" className="text-[20px] font-extrabold">
              Tried &amp; rated <span className="text-sub">{rated.length}</span>
            </h2>
            {rated.length ? <ul>{rated.map((f) => <Entry key={f.dishKey} f={f} />)}</ul> : <p className="mt-2 text-sub">Rate a dish after you try it and the next menu gets smarter.</p>}
          </section>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useStore } from "@/lib/client/store";
import { cuisineLabel } from "@/lib/domain/vocab";
import { SAMPLE_MENUS } from "@/lib/menu/samples";

export function MenusPage() {
  const { menus, removeMenu, hydrated } = useStore();
  return (
    <div className="wrap grid gap-10 pt-4">
      <header className="text-table-ink">
        <h1 className="font-display text-[clamp(40px,6vw,64px)] leading-none">Open a menu</h1>
        <p className="mt-3 max-w-[52ch] text-[18px] text-table-ink/85">Photograph the one in front of you, type a few dishes, or try a sample.</p>
      </header>

      <section aria-labelledby="new-h" className="grid gap-5 md:grid-cols-2">
        <h2 id="new-h" className="sr-only">
          Bring your own menu
        </h2>
        <Link href="/scan" className="paper paper-tilt-l group block no-underline">
          <p className="font-hand text-[20px] text-pen">at the table?</p>
          <h3 className="mt-1 font-display text-[30px] leading-tight group-hover:text-pen">Scan a menu</h3>
          <p className="mt-2 text-muted">Take or upload a photo. Text is read on your device, the photo is never uploaded, and you can fix anything it misreads.</p>
        </Link>
        <Link href="/scan?mode=type" className="paper paper-tilt-r group block no-underline">
          <p className="font-hand text-[20px] text-pen">ordering online?</p>
          <h3 className="mt-1 font-display text-[30px] leading-tight group-hover:text-pen">Type or paste dishes</h3>
          <p className="mt-2 text-muted">Paste a menu from a website, or jot down a few dish names. Dishwise works with whatever it&apos;s given.</p>
        </Link>
      </section>

      {hydrated && menus.length > 0 && (
        <section aria-labelledby="mine-h" className="grid gap-3">
          <h2 id="mine-h" className="font-display text-[28px] text-table-ink">
            Your menus
          </h2>
          <ul className="paper m-0 grid list-none gap-0 p-0">
            {menus.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3 last:border-0">
                <Link href={`/m/${m.id}`} className="min-w-0 hover:text-pen">
                  <span className="font-serif text-[18px] font-semibold">{m.title}</span>
                  <span className="ml-2 text-sm text-muted">
                    {m.items.length} dishes · {m.source === "scan" ? "scanned" : "typed"} {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </Link>
                <button type="button" className="link-pen shrink-0 text-sm text-muted" onClick={() => removeMenu(m.id)} aria-label={`Remove ${m.title}`}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="samples-h" className="grid gap-4">
        <div className="text-table-ink">
          <h2 id="samples-h" className="font-display text-[28px]">
            Sample menus
          </h2>
          <p className="text-table-ink/75">Fictional restaurants written for Dishwise. Rankings are computed live for your taste.</p>
        </div>
        <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_MENUS.map((m, i) => (
            <li key={m.id}>
              <Link href={`/m/${m.id}`} className={`paper group block h-full text-center no-underline ${i % 2 ? "paper-tilt-r" : "paper-tilt-l"}`}>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">{m.cuisine ? cuisineLabel(m.cuisine) : "Menu"}</p>
                <h3 className="mt-2 font-display text-[28px] leading-tight group-hover:text-pen">{m.title}</h3>
                <p className="kicker mt-1">{m.blurb}</p>
                <p className="mt-3 text-sm text-muted">{m.items.length} dishes</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

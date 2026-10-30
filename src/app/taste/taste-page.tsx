"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoverArt, coverGround } from "@/components/cover-art";
import { Icon } from "@/components/icons";
import { MatchPill } from "@/components/match";
import { TasteEditor } from "@/components/taste-editor";
import { useStore } from "@/lib/client/store";
import { enrichMenu } from "@/lib/menu/enrich";
import { SAMPLE_MENUS } from "@/lib/menu/samples";
import { recommend } from "@/lib/reco/rank";
import { commonReasons, topReasons } from "@/lib/reco/reasons";

function Preview() {
  const { profile, feedback } = useStore();
  const [menuId, setMenuId] = useState(SAMPLE_MENUS[0].id);
  const menu = SAMPLE_MENUS.find((m) => m.id === menuId)!;
  const dishes = useMemo(() => enrichMenu(menu.items, { menuKey: menu.id, menuCuisine: menu.cuisine }), [menu]);
  const rec = useMemo(() => recommend(dishes, profile, feedback), [dishes, profile, feedback]);
  const common = commonReasons(rec);
  return (
    <section aria-labelledby="preview-h" className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: coverGround(menu.cuisine) }}>
        <CoverArt cuisine={menu.cuisine} className="h-14 w-auto" />
        <div className="min-w-0 text-ink">
          <h2 id="preview-h" className="text-[15px] font-extrabold">
            Live preview
          </h2>
          <label className="sr-only" htmlFor="preview-menu">
            Preview menu
          </label>
          <select id="preview-menu" value={menuId} onChange={(e) => setMenuId(e.target.value)} className="mt-0.5 max-w-full rounded-lg border border-line bg-card px-2 py-1 text-[13.5px] font-semibold text-ink">
            {SAMPLE_MENUS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ol className="grid gap-0 px-4 py-2" aria-live="polite">
        {rec.picks.map((p, i) => (
          <li key={p.dish.key} className="grid grid-cols-[20px_1fr_auto] items-start gap-2.5 border-b border-line py-2.5 last:border-0">
            <span className="pt-0.5 text-[13px] font-extrabold text-sub">{i + 1}</span>
            <span>
              <span className="block text-[15px] font-bold leading-snug">{p.dish.name}</span>
              <span className="block text-[12.5px] text-sub">{topReasons(p, 1, common)[0]?.text ?? "From the menu alone"}</span>
            </span>
            <MatchPill r={p} />
          </li>
        ))}
      </ol>
      {rec.heldBack.length > 0 && <p className="border-t border-line px-4 py-2.5 text-[13px] font-semibold text-no">{rec.heldBack.length} held back for what you avoid</p>}
    </section>
  );
}

export function TastePage() {
  const { profileTouched, resetProfile } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="page pt-4 md:pt-8">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <div>
          <header className="mb-6 grid gap-1">
            <h1 className="text-[30px] font-black tracking-[-0.03em] md:text-[40px]">Your taste</h1>
            <p className="text-[16px] text-sub">Everything is optional, and you can change it any time. It&apos;s saved on this device{" "}<Link href="/account" className="link">or to your account</Link>.</p>
          </header>
          <TasteEditor />
          <div className="sticky bottom-[84px] z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bar p-3 backdrop-blur-md md:bottom-4">
            {confirmReset ? (
              <span className="flex flex-wrap items-center gap-3 px-1 text-[15px]">
                Clear everything?
                <button type="button" className="link text-no" onClick={() => { resetProfile(); setConfirmReset(false); }}>
                  Yes, clear it
                </button>
                <button type="button" className="link" onClick={() => setConfirmReset(false)}>
                  Keep it
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmReset(true)} disabled={!profileTouched}>
                Reset taste
              </button>
            )}
            <Link href="/" className="btn btn-primary">
              See my picks
              <Icon name="forward" size={18} />
            </Link>
          </div>
        </div>
        <aside className="sticky top-24 hidden lg:block">
          <Preview />
          <p className="mt-3 text-[13px] text-sub">Updates as you tap. Sample menus are fictional.</p>
        </aside>
      </div>
    </div>
  );
}

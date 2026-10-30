"use client";

import Link from "next/link";
import { useMemo } from "react";
import { REPO_URL } from "@/components/app-shell";
import { CoverArt, coverGround } from "@/components/cover-art";
import { GithubMark, Icon, Mark } from "@/components/icons";
import { ThemeToggleIcon } from "@/components/theme-toggle";
import { MatchPill, heldReason } from "@/components/match";
import { useStore } from "@/lib/client/store";
import { ingredientLabel } from "@/lib/domain/ingredients";
import { cuisineLabel, flavorLabel, groupLabel } from "@/lib/domain/vocab";
import { SAMPLE_MENUS } from "@/lib/menu/samples";
import { DEMO_MENU, demoRecommendation } from "@/lib/reco/demo";
import { commonReasons, topReasons } from "@/lib/reco/reasons";

function LiveDemo() {
  const { profile, profileTouched, feedback, hydrated } = useStore();
  const mine = hydrated && profileTouched;
  const { menu, rec } = useMemo(() => (mine ? demoRecommendation(profile, feedback) : demoRecommendation()), [mine, profile, feedback]);
  const common = commonReasons(rec);
  const held = rec.heldBack[0];
  return (
    <div className="card relative overflow-hidden shadow-[0_30px_60px_-36px_rgb(40_28_6/0.5)] transition-transform hover:-translate-y-1">
      <div className="grid h-28 grid-cols-[auto_1fr] items-center gap-4 px-5" style={{ background: coverGround(menu.cuisine) }}>
        <CoverArt cuisine={menu.cuisine} className="h-24 w-auto" />
        <div>
          <p className="text-[19px] font-extrabold leading-tight text-ink">{menu.title}</p>
          <p className="text-[13px] font-semibold text-ink/80">Sample menu · {menu.items.length} dishes</p>
        </div>
      </div>
      <div className="grid gap-1 p-5 pt-4">
        <p className="mb-1 text-[13px] text-sub">{mine ? "Ranked for your taste" : "Ranked for an example taste: loves pork and mushrooms, mild heat, no shellfish"}</p>
        {rec.picks.slice(0, 3).map((p, i) => (
          <div key={p.dish.key} className="grid grid-cols-[22px_1fr_auto] items-start gap-3 border-b border-line py-2.5 last:border-0">
            <span className="pt-0.5 text-[13px] font-extrabold text-sub">{i + 1}</span>
            <span>
              <span className="block text-[15.5px] font-bold leading-snug">{p.dish.name}</span>
              <span className="block text-[13px] text-ok">{topReasons(p, 2, common).map((r) => r.text).join(" · ") || "A solid choice here"}</span>
            </span>
            <MatchPill r={p} long />
          </div>
        ))}
        {held && (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-no-soft px-3 py-2 text-[13.5px] text-no">
            <span className="flex items-center gap-2 font-semibold">
              <Icon name="alert" size={16} />
              {held.dish.name}
            </span>
            <span>{heldReason(held)}</span>
          </div>
        )}
        <Link href={`/m/${menu.id}`} className="stretch mt-2 text-[14px] font-bold text-brand-text">
          See the whole menu ranked <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function TasteSummary() {
  const { profile, profileTouched, hydrated } = useStore();
  if (!hydrated) return <div className="card h-[120px]" aria-hidden="true" />;
  if (!profileTouched) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[17px] font-bold">Tell Dishwise what you like</p>
          <p className="text-[14.5px] text-sub">About a minute. Every question is optional.</p>
        </div>
        <Link href="/taste" className="btn btn-primary">
          Set your taste
        </Link>
      </div>
    );
  }
  const loves = [...profile.cuisines.map(cuisineLabel), ...profile.likedIngredients.map(ingredientLabel), ...profile.likedFlavors.map(flavorLabel), ...profile.favoriteFoods];
  const avoid = [...profile.dislikedIngredients.map(ingredientLabel), ...profile.restrictions.map((g) => `no ${groupLabel(g).toLowerCase()}`)];
  return (
    <div className="card grid gap-3 p-5">
      <div className="flex flex-wrap gap-2">
        {loves.slice(0, 10).map((l) => (
          <span key={l} className="chip pointer-events-none" data-state="love">
            <Icon name="check" size={15} />
            {l.toLowerCase()}
          </span>
        ))}
        {avoid.slice(0, 6).map((l) => (
          <span key={l} className="chip pointer-events-none" data-state="nope">
            {l.toLowerCase()}
          </span>
        ))}
        {profile.spiceTolerance !== null && <span className="chip pointer-events-none">{["No heat", "Mild", "Medium heat", "Hot", "Very hot"][profile.spiceTolerance]}</span>}
        {profile.diet !== "none" && <span className="chip pointer-events-none">{profile.diet}</span>}
      </div>
      <Link href="/taste" className="link justify-self-start">
        Edit your taste
      </Link>
    </div>
  );
}

function YourMenus() {
  const { menus, hydrated, removeMenu } = useStore();
  if (!hydrated || menus.length === 0) return null;
  return (
    <section aria-labelledby="mine-h" className="page mt-10">
      <h2 id="mine-h" className="text-[22px] font-extrabold tracking-[-0.015em]">
        Your menus
      </h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {menus.map((m) => (
          <li key={m.id} className="card flex items-center gap-2 pr-2 hover:shadow-[var(--shadow)]">
            <Link href={`/m/${m.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-[18px] p-4">
              <span className="grid h-14 w-16 flex-none place-items-center rounded-xl" style={{ background: coverGround(m.cuisine) }}>
                <CoverArt cuisine={m.cuisine} className="h-12 w-auto" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold">{m.title}</span>
                <span className="block text-[13.5px] text-sub">
                  {m.items.length} dishes · {m.source === "scan" ? "scanned" : "typed"} {new Date(m.createdAt).toLocaleDateString()}
                </span>
              </span>
            </Link>
            <button type="button" className="grid h-11 w-11 flex-none place-items-center rounded-full text-sub hover:bg-surf hover:text-no" onClick={() => removeMenu(m.id)} aria-label={`Remove ${m.title}`}>
              <Icon name="trash" size={19} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Home() {
  return (
    <div className="pt-3 md:pt-10">
      <div className="page flex items-center justify-between md:hidden">
        <span className="flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em]">
          <Mark />
          Dishwise
        </span>
        <span className="flex items-center gap-2">
          <ThemeToggleIcon />
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-full border border-ink/25 px-3.5 text-[15px] font-semibold text-ink">
            <GithubMark size={18} />
            Repository
            <span className="sr-only"> on GitHub (opens in a new tab)</span>
          </a>
        </span>
      </div>

      <section className="page mt-5 grid items-center gap-8 md:mt-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <div className="grid gap-5">
          <h1 className="text-[34px] font-black leading-[1.02] tracking-[-0.035em] text-balance md:text-[60px]">What should I order?</h1>
          <p className="max-w-[44ch] text-[17px] leading-relaxed text-sub md:text-[19px]">
            Snap the menu in front of you. Dishwise ranks every dish for your taste, shows exactly why, and holds back anything you avoid.
          </p>
          <Link href="/scan" className="group grid grid-cols-[1fr_auto] items-center gap-x-4 rounded-[22px] bg-brand p-5 text-brand-ink shadow-[var(--glow)] transition-transform hover:-translate-y-0.5 md:max-w-[460px]">
            <span className="text-[21px] font-extrabold tracking-[-0.015em]">Scan a menu</span>
            <span className="row-span-2 grid h-14 w-14 place-items-center rounded-2xl bg-brand-ink text-brand">
              <Icon name="camera" size={26} />
            </span>
            <span className="text-[14.5px] font-medium opacity-80">Point your camera at the menu. The photo stays on your device.</span>
          </Link>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/scan?mode=type" className="btn btn-secondary">
              <Icon name="paste" size={19} />
              Paste a menu
            </Link>
            <Link href={`/m/${DEMO_MENU}`} className="btn btn-secondary">
              <Icon name="sparkle" size={19} />
              Try a sample
            </Link>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-semibold text-sub">
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={16} className="text-ok" />
              Free
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={16} className="text-ok" />
              No sign-up
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check" size={16} className="text-ok" />
              Every score explained
            </span>
          </p>
        </div>
        <LiveDemo />
      </section>

      <section aria-labelledby="samples-h" className="mt-12">
        <div className="page flex items-baseline justify-between">
          <h2 id="samples-h" className="text-[22px] font-extrabold tracking-[-0.015em]">
            Try a sample menu
          </h2>
          <span className="text-[13.5px] text-sub">Fictional restaurants</span>
        </div>
        <ul className="rail mt-3 md:mx-auto md:grid md:max-w-[1240px] md:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {SAMPLE_MENUS.map((m) => (
            <li key={m.id} className="w-[220px] md:w-auto">
              <Link href={`/m/${m.id}`} className="group block">
                <span className="relative grid h-32 place-items-center overflow-hidden rounded-2xl transition-transform group-hover:-translate-y-0.5" style={{ background: coverGround(m.cuisine) }}>
                  <CoverArt cuisine={m.cuisine} className="h-[86%] w-auto transition-transform duration-300 group-hover:scale-105" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-card px-2 py-0.5 text-[11.5px] font-semibold text-ink">Sample</span>
                </span>
                <span className="mt-2 block text-[16px] font-bold leading-tight">{m.title}</span>
                <span className="block text-[13.5px] text-sub">
                  {m.cuisine ? cuisineLabel(m.cuisine) : "Menu"} · {m.items.length} dishes
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <YourMenus />

      <section aria-labelledby="taste-h" className="page mt-10">
        <h2 id="taste-h" className="text-[22px] font-extrabold tracking-[-0.015em]">
          Your taste
        </h2>
        <div className="mt-3">
          <TasteSummary />
        </div>
      </section>

      <section aria-labelledby="how-h" className="page mt-12">
        <h2 id="how-h" className="text-[22px] font-extrabold tracking-[-0.015em]">
          How Dishwise picks
        </h2>
        <ol className="mt-4 grid gap-6 md:grid-cols-3">
          {[
            ["Reads the menu", "Text is read on your device. Every ingredient is marked as on the menu or from a typical recipe. Nothing is invented."],
            ["Scores every dish", "Your likes add points, dislikes and too much heat take them away. Each score shows exactly where its points came from."],
            ["Learns and stays careful", "Rate what you order and the next menu adapts. Anything that conflicts with what you avoid is held back, never called safe."],
          ].map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[36px_1fr] gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-[15px] font-extrabold text-brand-text">{i + 1}</span>
              <span>
                <span className="block text-[17px] font-bold">{t}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-sub">{b}</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/how" className="link mt-5 inline-block">
          See how the scoring works
        </Link>
      </section>
    </div>
  );
}

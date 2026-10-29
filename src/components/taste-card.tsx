"use client";

import { useId, useState, type ReactNode } from "react";
import { useStore } from "@/lib/client/store";
import { PICKABLE_INGREDIENTS } from "@/lib/domain/ingredients";
import type { TasteProfile } from "@/lib/domain/schemas";
import { BUDGETS, CUISINES, DIETS, FLAVORS, RESTRICTABLE_GROUPS, groupLabel, type SpiceLevel } from "@/lib/domain/vocab";
import { ChiliIcon, PenCircle, PenStrike } from "./pen";

type Pref = "love" | "nope" | null;

function Word({ label, pref, onCycle, twoState = false }: { label: string; pref: Pref; onCycle: () => void; twoState?: boolean }) {
  const state = pref === "love" ? (twoState ? "circled" : "love") : pref === "nope" ? "avoid" : "no preference";
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-pressed={pref !== null}
      aria-label={`${label}: ${state}`}
      className={`relative min-h-10 px-1.5 font-serif text-[19px] leading-[1.6] ${pref === "nope" ? "text-muted" : "text-ink"}`}
    >
      {label}
      {pref === "love" && <PenCircle />}
      {pref === "nope" && <PenStrike />}
    </button>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mt-5 first:mt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id={id} className="label">
          {title}
        </h3>
        {hint && <p className="font-hand text-[16px] text-pen">{hint}</p>}
      </div>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

const cycle = (p: Pref): Pref => (p === null ? "love" : p === "love" ? "nope" : null);

function triState<K extends "Ingredients" | "Flavors">(profile: TasteProfile, kind: K, id: string): Pref {
  const liked = kind === "Ingredients" ? profile.likedIngredients : profile.likedFlavors;
  const disliked = kind === "Ingredients" ? profile.dislikedIngredients : profile.dislikedFlavors;
  return (liked as string[]).includes(id) ? "love" : (disliked as string[]).includes(id) ? "nope" : null;
}

function setTri(p: TasteProfile, kind: "Ingredients" | "Flavors", id: string, v: Pref): TasteProfile {
  const L = kind === "Ingredients" ? "likedIngredients" : "likedFlavors";
  const D = kind === "Ingredients" ? "dislikedIngredients" : "dislikedFlavors";
  const liked = (p[L] as string[]).filter((x) => x !== id);
  const disliked = (p[D] as string[]).filter((x) => x !== id);
  if (v === "love") liked.push(id);
  if (v === "nope") disliked.push(id);
  return { ...p, [L]: liked, [D]: disliked } as TasteProfile;
}

const FAVORITE_SUGGESTIONS = ["ramen", "tacos", "pizza", "curry", "dumplings", "burger", "pho", "sushi", "pasta", "falafel"];
const HEAT_LABELS = ["no heat", "mild", "medium", "hot", "very hot"];

export function TasteCard({ compactIngredients = false }: { compactIngredients?: boolean }) {
  const { profile, setProfile } = useStore();
  const [fav, setFav] = useState("");
  const [showAll, setShowAll] = useState(!compactIngredients);
  const ingredients = showAll ? PICKABLE_INGREDIENTS : PICKABLE_INGREDIENTS.slice(0, 14);

  const addFavorite = (raw: string) => {
    const v = raw.trim().toLowerCase().slice(0, 40);
    if (!v) return;
    setProfile((p) => (p.favoriteFoods.includes(v) || p.favoriteFoods.length >= 12 ? p : { ...p, favoriteFoods: [...p.favoriteFoods, v] }));
    setFav("");
  };

  return (
    <div>
      <Row title="Cuisines you love" hint="tap to circle">
        <div className="flex flex-wrap gap-x-3">
          {CUISINES.map((c) => (
            <Word
              key={c.id}
              twoState
              label={c.label}
              pref={profile.cuisines.includes(c.id) ? "love" : null}
              onCycle={() =>
                setProfile((p) => ({ ...p, cuisines: p.cuisines.includes(c.id) ? p.cuisines.filter((x) => x !== c.id) : [...p.cuisines, c.id] }))
              }
            />
          ))}
        </div>
      </Row>

      <Row title="Favourite dishes" hint="write a few">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addFavorite(fav);
          }}
        >
          <label className="sr-only" htmlFor="fav-input">
            Add a favourite dish
          </label>
          <input id="fav-input" className="field font-hand text-[20px] text-pen" value={fav} onChange={(e) => setFav(e.target.value)} placeholder="e.g. ramen, tacos…" maxLength={40} />
          <button type="submit" className="link-pen shrink-0 pb-1.5">
            add
          </button>
        </form>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {profile.favoriteFoods.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setProfile((p) => ({ ...p, favoriteFoods: p.favoriteFoods.filter((x) => x !== f) }))}
              className="font-hand text-[20px] text-pen"
              aria-label={`Remove ${f}`}
            >
              {f} <span className="text-muted">×</span>
            </button>
          ))}
          {FAVORITE_SUGGESTIONS.filter((s) => !profile.favoriteFoods.includes(s))
            .slice(0, profile.favoriteFoods.length ? 4 : 8)
            .map((s) => (
              <button key={s} type="button" onClick={() => addFavorite(s)} className="font-serif text-[15px] italic text-muted hover:text-pen" aria-label={`Add ${s}`}>
                + {s}
              </button>
            ))}
        </div>
      </Row>

      <Row title="Ingredients" hint="once to circle · twice to cross out">
        <div className="flex flex-wrap gap-x-3">
          {ingredients.map((i) => (
            <Word
              key={i.id}
              label={i.label.toLowerCase()}
              pref={triState(profile, "Ingredients", i.id)}
              onCycle={() => setProfile((p) => setTri(p, "Ingredients", i.id, cycle(triState(p, "Ingredients", i.id))))}
            />
          ))}
          {!showAll && (
            <button type="button" className="link-pen px-1.5 text-[15px]" onClick={() => setShowAll(true)}>
              {PICKABLE_INGREDIENTS.length - ingredients.length} more…
            </button>
          )}
        </div>
      </Row>

      <Row title="Flavours">
        <div className="flex flex-wrap gap-x-3">
          {FLAVORS.map((f) => (
            <Word
              key={f.id}
              label={f.label.toLowerCase()}
              pref={triState(profile, "Flavors", f.id)}
              onCycle={() => setProfile((p) => setTri(p, "Flavors", f.id, cycle(triState(p, "Flavors", f.id))))}
            />
          ))}
        </div>
      </Row>

      <Row title="Heat" hint={profile.spiceTolerance === null ? "skipped" : HEAT_LABELS[profile.spiceTolerance]}>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Spice tolerance">
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={profile.spiceTolerance === n}
              aria-label={HEAT_LABELS[n]}
              onClick={() => setProfile((p) => ({ ...p, spiceTolerance: p.spiceTolerance === n ? null : (n as SpiceLevel) }))}
              className={`grid h-11 min-w-11 place-items-center rounded-full ${n === 0 ? "px-2 font-hand text-[17px]" : ""} ${profile.spiceTolerance === 0 && n === 0 ? "text-pen" : "text-muted"}`}
            >
              {n === 0 ? (
                <span className="relative">
                  none{profile.spiceTolerance === 0 && <PenCircle />}
                </span>
              ) : (
                <ChiliIcon filled={profile.spiceTolerance !== null && n <= profile.spiceTolerance} />
              )}
            </button>
          ))}
        </div>
      </Row>

      <Row title="Diet">
        <div className="flex flex-wrap gap-x-3" role="radiogroup" aria-label="Diet">
          {DIETS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={profile.diet === d.id}
              onClick={() => setProfile((p) => ({ ...p, diet: d.id }))}
              className="relative min-h-10 px-1.5 font-serif text-[18px]"
            >
              {d.label}
              {profile.diet === d.id && d.id !== "none" && <PenCircle />}
            </button>
          ))}
        </div>
      </Row>

      <Row title="Avoid completely">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {RESTRICTABLE_GROUPS.map((g) => {
            const id = `avoid-${g}`;
            const on = profile.restrictions.includes(g);
            return (
              <label key={g} htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-2 text-[17px]">
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={() => setProfile((p) => ({ ...p, restrictions: on ? p.restrictions.filter((x) => x !== g) : [...p.restrictions, g] }))}
                  className="peer sr-only"
                />
                <span aria-hidden="true" className="grid h-[18px] w-[18px] place-items-center border-[1.5px] border-ink peer-focus-visible:outline-2 peer-focus-visible:outline-dashed peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pen">
                  {on && <span className="-translate-y-0.5 translate-x-0.5 font-hand text-[22px] leading-none text-pen">✓</span>}
                </span>
                {groupLabel(g).toLowerCase()}
              </label>
            );
          })}
        </div>
        {profile.restrictions.length > 0 && (
          <p className="mt-2 text-sm text-muted">Dishwise flags what the menu says and what dishes usually contain. It can&apos;t see the kitchen, so confirm allergies with the restaurant.</p>
        )}
      </Row>

      <Row title="Budget">
        <div className="flex flex-wrap gap-x-3" role="radiogroup" aria-label="Budget">
          {BUDGETS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={profile.budget === b.id}
              onClick={() => setProfile((p) => ({ ...p, budget: b.id }))}
              className="relative min-h-10 px-1.5 font-serif text-[17px]"
            >
              {b.label}
              {profile.budget === b.id && b.id !== "any" && <PenCircle />}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

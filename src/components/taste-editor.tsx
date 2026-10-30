"use client";

import { useId, useState, type ReactNode } from "react";
import { useStore } from "@/lib/client/store";
import { PICKABLE_INGREDIENTS } from "@/lib/domain/ingredients";
import type { TasteProfile } from "@/lib/domain/schemas";
import { BUDGETS, CUISINES, DIETS, FLAVORS, RESTRICTABLE_GROUPS, groupLabel, type SpiceLevel } from "@/lib/domain/vocab";
import { Icon } from "./icons";

type Pref = "love" | "nope" | null;
const cycle = (p: Pref): Pref => (p === null ? "love" : p === "love" ? "nope" : null);

/** Shown first while the list is collapsed: the most taste-defining picks, not just proteins. */
const FEATURED = ["chicken", "beef", "pork", "salmon", "shrimp", "tofu", "egg", "cheese", "mushroom", "chili", "cilantro", "garlic", "avocado", "olives"];
const ORDERED = [...FEATURED.map((id) => PICKABLE_INGREDIENTS.find((i) => i.id === id)!).filter(Boolean), ...PICKABLE_INGREDIENTS.filter((i) => !FEATURED.includes(i.id))];
const SUGGESTIONS = ["ramen", "tacos", "pizza", "curry", "dumplings", "burger", "pho", "sushi", "pasta", "falafel"];
const HEAT = ["No heat", "Mild", "Medium", "Hot", "Very hot"];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-3 border-b border-line py-6 first:pt-0 last:border-0">
      <div>
        <h2 id={id} className="text-[18px] font-extrabold tracking-[-0.01em]">
          {title}
        </h2>
        {hint && <p className="text-[14px] text-sub">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function TriChip({ label, pref, onTap }: { label: string; pref: Pref; onTap: () => void }) {
  return (
    <button type="button" className="chip" data-state={pref ?? undefined} aria-pressed={pref !== null} aria-label={`${label}: ${pref === "love" ? "love" : pref === "nope" ? "avoid" : "no preference"}`} onClick={onTap}>
      {pref === "love" && <Icon name="check" size={15} />}
      {pref === "nope" && <Icon name="x" size={15} />}
      {label}
    </button>
  );
}

function tri(p: TasteProfile, kind: "ing" | "flv", id: string): Pref {
  const liked = (kind === "ing" ? p.likedIngredients : p.likedFlavors) as string[];
  const disliked = (kind === "ing" ? p.dislikedIngredients : p.dislikedFlavors) as string[];
  return liked.includes(id) ? "love" : disliked.includes(id) ? "nope" : null;
}

function setTri(p: TasteProfile, kind: "ing" | "flv", id: string, v: Pref): TasteProfile {
  const L = kind === "ing" ? "likedIngredients" : "likedFlavors";
  const Dk = kind === "ing" ? "dislikedIngredients" : "dislikedFlavors";
  const liked = (p[L] as string[]).filter((x) => x !== id);
  const disliked = (p[Dk] as string[]).filter((x) => x !== id);
  if (v === "love") liked.push(id);
  if (v === "nope") disliked.push(id);
  return { ...p, [L]: liked, [Dk]: disliked } as TasteProfile;
}

export function TasteEditor() {
  const { profile, setProfile } = useStore();
  const [fav, setFav] = useState("");
  const [showAll, setShowAll] = useState(false);
  const ingredients = showAll ? ORDERED : ORDERED.slice(0, FEATURED.length);

  const addFavorite = (raw: string) => {
    const v = raw.trim().toLowerCase().slice(0, 40);
    if (!v) return;
    setProfile((p) => (p.favoriteFoods.includes(v) || p.favoriteFoods.length >= 12 ? p : { ...p, favoriteFoods: [...p.favoriteFoods, v] }));
    setFav("");
  };

  return (
    <div>
      <Section title="Cuisines you love" hint="Pick any.">
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => {
            const on = profile.cuisines.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="chip"
                data-state={on ? "love" : undefined}
                aria-pressed={on}
                aria-label={`${c.label}: ${on ? "selected" : "no preference"}`}
                onClick={() => setProfile((p) => ({ ...p, cuisines: on ? p.cuisines.filter((x) => x !== c.id) : [...p.cuisines, c.id] }))}
              >
                {on && <Icon name="check" size={15} />}
                {c.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Favourite dishes" hint="Add a few you always order.">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addFavorite(fav);
          }}
        >
          <label className="sr-only" htmlFor="fav-input">
            Add a favourite dish
          </label>
          <input id="fav-input" className="field" value={fav} onChange={(e) => setFav(e.target.value)} placeholder="e.g. ramen, tacos" maxLength={40} />
          <button type="submit" className="btn btn-secondary" disabled={!fav.trim()}>
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {profile.favoriteFoods.map((f) => (
            <button key={f} type="button" className="chip" data-state="love" onClick={() => setProfile((p) => ({ ...p, favoriteFoods: p.favoriteFoods.filter((x) => x !== f) }))} aria-label={`Remove ${f}`}>
              {f}
              <Icon name="x" size={15} />
            </button>
          ))}
          {SUGGESTIONS.filter((s) => !profile.favoriteFoods.includes(s))
            .slice(0, profile.favoriteFoods.length ? 4 : 7)
            .map((s) => (
              <button key={s} type="button" className="chip border-dashed !border-line bg-transparent text-sub" onClick={() => addFavorite(s)} aria-label={`Add ${s}`}>
                <Icon name="plus" size={15} />
                {s}
              </button>
            ))}
        </div>
      </Section>

      <Section title="Ingredients" hint="Tap once if you love it, twice if you'd rather avoid it, three times to clear.">
        <div className="flex flex-wrap gap-2">
          {ingredients.map((i) => (
            <TriChip key={i.id} label={i.label.toLowerCase()} pref={tri(profile, "ing", i.id)} onTap={() => setProfile((p) => setTri(p, "ing", i.id, cycle(tri(p, "ing", i.id))))} />
          ))}
          {!showAll && (
            <button type="button" className="link px-2" onClick={() => setShowAll(true)}>
              Show all {ORDERED.length}
            </button>
          )}
        </div>
      </Section>

      <Section title="Flavours">
        <div className="flex flex-wrap gap-2">
          {FLAVORS.map((f) => (
            <TriChip key={f.id} label={f.label.toLowerCase()} pref={tri(profile, "flv", f.id)} onTap={() => setProfile((p) => setTri(p, "flv", f.id, cycle(tri(p, "flv", f.id))))} />
          ))}
        </div>
      </Section>

      <Section title="How much heat?" hint={profile.spiceTolerance === null ? "Skipped" : undefined}>
        <div className="grid grid-cols-5 gap-1.5 rounded-2xl bg-surf p-1.5" role="radiogroup" aria-label="Spice tolerance">
          {HEAT.map((label, n) => {
            const on = profile.spiceTolerance === n;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setProfile((p) => ({ ...p, spiceTolerance: on ? null : (n as SpiceLevel) }))}
                className={`grid min-h-16 place-items-center gap-0.5 rounded-xl px-1 text-[12.5px] font-semibold transition-colors ${on ? "bg-card text-ink shadow-[var(--shadow)]" : "text-sub hover:text-ink"}`}
              >
                <span className="flex h-5 items-center text-no">
                  {n === 0 ? <Icon name="x" size={16} className="text-sub" /> : Array.from({ length: n }, (_, k) => <Icon key={k} name="chili" size={14} />)}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Diet">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Diet">
          {DIETS.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={profile.diet === d.id} className="chip" data-state={profile.diet === d.id ? "on" : undefined} onClick={() => setProfile((p) => ({ ...p, diet: d.id }))}>
              {d.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Avoid completely" hint="Allergies, intolerances, or anything you never eat.">
        <div className="flex flex-wrap gap-2">
          {RESTRICTABLE_GROUPS.map((g) => {
            const id = `avoid-${g}`;
            const on = profile.restrictions.includes(g);
            return (
              <label key={g} htmlFor={id} className="chip has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand" data-state={on ? "nope" : undefined} style={on ? { textDecoration: "none" } : undefined}>
                <input id={id} type="checkbox" className="sr-only" checked={on} onChange={() => setProfile((p) => ({ ...p, restrictions: on ? p.restrictions.filter((x) => x !== g) : [...p.restrictions, g] }))} />
                {on && <Icon name="x" size={15} />}
                {groupLabel(g).toLowerCase()}
              </label>
            );
          })}
        </div>
        {profile.restrictions.length > 0 && (
          <p className="flex gap-2 rounded-xl bg-warn-soft p-3 text-[13.5px] text-warn">
            <Icon name="alert" size={17} className="mt-0.5" />
            Dishwise flags what the menu says and what dishes usually contain. It can&apos;t see the kitchen, so confirm allergies with the restaurant.
          </p>
        )}
      </Section>

      <Section title="Budget">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Budget">
          {BUDGETS.map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={profile.budget === b.id} className="chip" data-state={profile.budget === b.id ? "on" : undefined} onClick={() => setProfile((p) => ({ ...p, budget: b.id }))}>
              {b.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

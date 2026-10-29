"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import {
  cuisineId,
  emptyProfile,
  feedbackSchema,
  menuItemInputSchema,
  tasteProfileSchema,
  type Feedback,
  type MenuItemInput,
  type TasteProfile,
} from "@/lib/domain/schemas";
import type { EnrichedDish } from "@/lib/menu/enrich";
import { toSnapshot } from "@/lib/reco/features";

/**
 * Client state as a tiny external store (read with useSyncExternalStore):
 * guests persist to localStorage; signed-in users also write through to /api/me/*.
 */

const localMenuSchema = z.object({
  id: z.string().regex(/^local-[a-z0-9-]+$/),
  title: z.string().max(120),
  cuisine: cuisineId.optional(),
  currency: z.string().length(3).default("USD"),
  source: z.enum(["scan", "manual"]),
  items: z.array(menuItemInputSchema).min(1).max(250),
  createdAt: z.string(),
});
export type LocalMenu = z.infer<typeof localMenuSchema>;

const persistedSchema = z.object({
  v: z.literal(1),
  profile: tasteProfileSchema,
  profileTouched: z.boolean().default(false),
  feedback: z.array(feedbackSchema).max(500).default([]),
  menus: z.array(localMenuSchema).max(30).default([]),
});
type Persisted = z.infer<typeof persistedSchema>;

export type AccountState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "unavailable" }
  | { status: "signed-in"; email: string | null; name: string | null };

interface Snapshot extends Persisted {
  hydrated: boolean;
  account: AccountState;
  syncError: string | null;
}

const KEY = "dishwise:v1";
const SYNCED_KEY = "dishwise:synced-account";

const fresh = (): Persisted => ({ v: 1, profile: emptyProfile(), profileTouched: false, feedback: [], menus: [] });
const SERVER_SNAPSHOT: Snapshot = { ...fresh(), hydrated: false, account: { status: "loading" }, syncError: null };

let snap: Snapshot = SERVER_SNAPSHOT;
let started = false;
const listeners = new Set<() => void>();
let profileTimer: ReturnType<typeof setTimeout> | null = null;

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* blocked or full: keep working in memory */
  }
}

function loadPersisted(): Persisted {
  const raw = storageGet(KEY);
  if (!raw) return fresh();
  try {
    const parsed = persistedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fresh();
  } catch {
    return fresh();
  }
}

function set(patch: Partial<Snapshot>) {
  snap = { ...snap, ...patch };
  if (snap.hydrated && ("profile" in patch || "feedback" in patch || "menus" in patch || "profileTouched" in patch)) {
    const { v, profile, profileTouched, feedback, menus } = snap;
    storageSet(KEY, JSON.stringify({ v, profile, profileTouched, feedback, menus }));
  }
  for (const l of listeners) l();
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    return { ok: res.ok, status: res.status, data, error: data?.error };
  } catch {
    return { ok: false, status: 0, data: null, error: "You seem to be offline." };
  }
}

const signedIn = () => snap.account.status === "signed-in";

// ---- actions --------------------------------------------------------------------------------

async function refreshAccount() {
  const me = await api<{ user: { email: string | null; name: string | null }; profile: TasteProfile | null; feedback: Feedback[] }>("/api/me");
  if (!me.ok || !me.data) return set({ account: { status: me.status === 401 ? "guest" : "unavailable" } });
  const { user } = me.data;
  let { profile, feedback } = me.data;

  // First sign-in on this device: merge guest data into the account.
  const marker = user.email ?? "account";
  if (storageGet(SYNCED_KEY) !== marker) {
    const merged = await api<{ profile: TasteProfile | null; feedback: Feedback[] }>("/api/me/sync", {
      method: "POST",
      body: JSON.stringify({ profile: snap.profileTouched ? snap.profile : undefined, feedback: snap.feedback }),
    });
    if (merged.ok && merged.data) {
      ({ profile, feedback } = merged.data);
      storageSet(SYNCED_KEY, marker);
    }
  }
  set({
    profile: profile ?? snap.profile,
    profileTouched: snap.profileTouched || !!profile,
    feedback,
    account: { status: "signed-in", email: user.email, name: user.name },
  });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  snap = { ...snap, ...loadPersisted(), hydrated: true };
  void refreshAccount();
}

function pushProfile(p: TasteProfile) {
  if (!signedIn()) return;
  if (profileTimer) clearTimeout(profileTimer);
  profileTimer = setTimeout(async () => {
    const r = await api("/api/me/profile", { method: "PUT", body: JSON.stringify(p) });
    set({ syncError: r.ok ? null : (r.error ?? "Couldn't save your taste to your account.") });
  }, 600);
}

const actions = {
  setProfile(update: (p: TasteProfile) => TasteProfile) {
    const profile = tasteProfileSchema.parse(update(snap.profile));
    set({ profile, profileTouched: true });
    pushProfile(profile);
  },
  resetProfile() {
    const profile = emptyProfile();
    set({ profile, profileTouched: false });
    pushProfile(profile);
  },
  feedbackFor(dishKey: string): Feedback | undefined {
    return snap.feedback.find((f) => f.dishKey === dishKey);
  },
  updateFeedback(dish: EnrichedDish, patch: Partial<Pick<Feedback, "saved" | "tried" | "rating">>, menuTitle?: string) {
    const cur = snap.feedback.find((f) => f.dishKey === dish.key);
    const rating = patch.rating !== undefined ? patch.rating : (cur?.rating ?? null);
    const next: Feedback = {
      dishKey: dish.key,
      snapshot: cur?.snapshot ?? toSnapshot(dish, menuTitle),
      saved: patch.saved ?? cur?.saved ?? false,
      tried: rating !== null ? true : (patch.tried ?? cur?.tried ?? false),
      rating,
      updatedAt: new Date().toISOString(),
    };
    const empty = !next.saved && !next.tried && next.rating === null;
    const rest = snap.feedback.filter((f) => f.dishKey !== dish.key);
    set({ feedback: empty ? rest : [next, ...rest].slice(0, 500) });
    if (signedIn()) {
      void api("/api/me/feedback", { method: "PUT", body: JSON.stringify(next) }).then((r) =>
        set({ syncError: r.ok ? null : (r.error ?? "Couldn't save that rating to your account.") }),
      );
    }
  },
  removeFeedback(dishKey: string) {
    set({ feedback: snap.feedback.filter((f) => f.dishKey !== dishKey) });
    if (signedIn()) void api(`/api/me/feedback?dishKey=${encodeURIComponent(dishKey)}`, { method: "DELETE" });
  },
  addMenu(menu: { title: string; cuisine?: LocalMenu["cuisine"]; items: MenuItemInput[]; source: LocalMenu["source"] }): string {
    const id = `local-${crypto.randomUUID()}`;
    const m: LocalMenu = { id, currency: "USD", createdAt: new Date().toISOString(), ...menu };
    set({ menus: [m, ...snap.menus].slice(0, 30) });
    if (signedIn()) {
      void api("/api/me/menus", { method: "POST", body: JSON.stringify({ menu: { title: m.title, cuisine: m.cuisine, items: m.items }, source: m.source }) });
    }
    return id;
  },
  removeMenu(id: string) {
    set({ menus: snap.menus.filter((m) => m.id !== id) });
  },
  refreshAccount,
  signedOut() {
    storageSet(SYNCED_KEY, null);
    set({ account: { status: "guest" } });
  },
  clearLocal() {
    storageSet(KEY, null);
    storageSet(SYNCED_KEY, null);
    set(fresh());
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export function useStore() {
  const s = useSyncExternalStore(
    subscribe,
    () => snap,
    () => SERVER_SNAPSHOT,
  );
  return { ...s, ...actions };
}

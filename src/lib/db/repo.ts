import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  feedbackSchema,
  menuInputSchema,
  tasteProfileSchema,
  type Feedback,
  type MenuInput,
  type TasteProfile,
} from "@/lib/domain/schemas";
import * as schema from "./schema";

/**
 * Data access layer. Every function takes the *authenticated* user id as its first argument and
 * scopes every query by it, so one user can never read or change another user's rows.
 * Inputs are validated with zod here as well as at the route, so the DAL is safe on its own.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, any>;

export const LIMITS = { feedbackPerUser: 500, menusPerUser: 30 } as const;

export class LimitError extends Error {}

const assertUser = (userId: string) => {
  if (!userId || typeof userId !== "string") throw new Error("Missing user id");
};

// ---- Profile ------------------------------------------------------------------------------

export async function getProfile(db: Db, userId: string): Promise<TasteProfile | null> {
  assertUser(userId);
  const [row] = await db.select().from(schema.tasteProfiles).where(eq(schema.tasteProfiles.userId, userId));
  if (!row) return null;
  // Re-validate on read so old/invalid stored shapes never reach the engine.
  const parsed = tasteProfileSchema.safeParse(row.profile);
  return parsed.success ? parsed.data : null;
}

export async function saveProfile(db: Db, userId: string, input: unknown): Promise<TasteProfile> {
  assertUser(userId);
  const profile = tasteProfileSchema.parse(input);
  await db
    .insert(schema.tasteProfiles)
    .values({ userId, profile })
    .onConflictDoUpdate({ target: schema.tasteProfiles.userId, set: { profile, updatedAt: sql`now()` } });
  return profile;
}

// ---- Feedback (saved / tried / rating) -----------------------------------------------------

const toFeedback = (r: typeof schema.dishFeedback.$inferSelect): Feedback => ({
  dishKey: r.dishKey,
  snapshot: r.snapshot,
  saved: r.saved,
  tried: r.tried,
  rating: r.rating,
  updatedAt: r.updatedAt.toISOString(),
});

export async function listFeedback(db: Db, userId: string): Promise<Feedback[]> {
  assertUser(userId);
  const rows = await db
    .select()
    .from(schema.dishFeedback)
    .where(eq(schema.dishFeedback.userId, userId))
    .orderBy(desc(schema.dishFeedback.updatedAt))
    .limit(LIMITS.feedbackPerUser);
  return rows.map(toFeedback);
}

/** Insert or update one dish's feedback. A row with nothing set (not saved/tried/rated) is deleted. */
export async function upsertFeedback(db: Db, userId: string, input: unknown): Promise<Feedback | null> {
  assertUser(userId);
  const f = feedbackSchema.parse(input);
  if (!f.saved && !f.tried && f.rating === null) {
    await deleteFeedback(db, userId, f.dishKey);
    return null;
  }
  const existing = await db
    .select({ id: schema.dishFeedback.id })
    .from(schema.dishFeedback)
    .where(and(eq(schema.dishFeedback.userId, userId), eq(schema.dishFeedback.dishKey, f.dishKey)));
  if (existing.length === 0) {
    const [{ n }] = await db.select({ n: count() }).from(schema.dishFeedback).where(eq(schema.dishFeedback.userId, userId));
    if (n >= LIMITS.feedbackPerUser) throw new LimitError(`You can keep up to ${LIMITS.feedbackPerUser} rated or saved dishes.`);
  }
  const values = { userId, dishKey: f.dishKey, snapshot: f.snapshot, saved: f.saved, tried: f.tried, rating: f.rating };
  const [row] = await db
    .insert(schema.dishFeedback)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.dishFeedback.userId, schema.dishFeedback.dishKey],
      set: { snapshot: f.snapshot, saved: f.saved, tried: f.tried, rating: f.rating, updatedAt: sql`now()` },
    })
    .returning();
  return toFeedback(row);
}

export async function deleteFeedback(db: Db, userId: string, dishKey: string): Promise<void> {
  assertUser(userId);
  await db.delete(schema.dishFeedback).where(and(eq(schema.dishFeedback.userId, userId), eq(schema.dishFeedback.dishKey, dishKey)));
}

/**
 * Merge a guest's local data into their account on first sign-in.
 * Profile: the account's stored profile wins if it exists. Feedback: newest per dish wins.
 */
export async function mergeGuestData(
  db: Db,
  userId: string,
  guest: { profile?: unknown; feedback?: unknown[] },
): Promise<{ profile: TasteProfile | null; feedback: Feedback[] }> {
  assertUser(userId);
  let profile = await getProfile(db, userId);
  if (!profile && guest.profile) {
    const parsed = tasteProfileSchema.safeParse(guest.profile);
    if (parsed.success) profile = await saveProfile(db, userId, parsed.data);
  }

  const incoming = (guest.feedback ?? [])
    .map((f) => feedbackSchema.safeParse(f))
    .filter((r) => r.success)
    .map((r) => r.data)
    .slice(0, LIMITS.feedbackPerUser);
  if (incoming.length > 0) {
    const keys = incoming.map((f) => f.dishKey);
    const current = await db
      .select()
      .from(schema.dishFeedback)
      .where(and(eq(schema.dishFeedback.userId, userId), inArray(schema.dishFeedback.dishKey, keys)));
    const currentByKey = new Map(current.map((r) => [r.dishKey, r]));
    for (const f of incoming) {
      const cur = currentByKey.get(f.dishKey);
      const incomingAt = f.updatedAt ? Date.parse(f.updatedAt) : 0;
      if (cur && cur.updatedAt.getTime() >= incomingAt) continue;
      try {
        await upsertFeedback(db, userId, f);
      } catch (e) {
        if (e instanceof LimitError) break;
        throw e;
      }
    }
  }
  return { profile, feedback: await listFeedback(db, userId) };
}

// ---- Menu history -------------------------------------------------------------------------

export async function saveMenu(db: Db, userId: string, input: unknown, source: "scan" | "manual" | "sample") {
  assertUser(userId);
  const m: MenuInput = menuInputSchema.parse(input);
  const [{ n }] = await db.select({ n: count() }).from(schema.menus).where(eq(schema.menus.userId, userId));
  if (n >= LIMITS.menusPerUser) {
    // Keep history bounded: drop the oldest menu.
    const [oldest] = await db
      .select({ id: schema.menus.id })
      .from(schema.menus)
      .where(eq(schema.menus.userId, userId))
      .orderBy(schema.menus.createdAt)
      .limit(1);
    if (oldest) await db.delete(schema.menus).where(and(eq(schema.menus.id, oldest.id), eq(schema.menus.userId, userId)));
  }
  const [row] = await db
    .insert(schema.menus)
    .values({ userId, title: m.title, source, cuisine: m.cuisine ?? null, items: m.items })
    .returning({ id: schema.menus.id, createdAt: schema.menus.createdAt });
  return row;
}

export async function listMenus(db: Db, userId: string) {
  assertUser(userId);
  return db
    .select({ id: schema.menus.id, title: schema.menus.title, source: schema.menus.source, createdAt: schema.menus.createdAt })
    .from(schema.menus)
    .where(eq(schema.menus.userId, userId))
    .orderBy(desc(schema.menus.createdAt));
}

export async function getMenu(db: Db, userId: string, id: string) {
  assertUser(userId);
  const [row] = await db
    .select()
    .from(schema.menus)
    .where(and(eq(schema.menus.id, id), eq(schema.menus.userId, userId)));
  return row ?? null;
}

// ---- Account ------------------------------------------------------------------------------

/** Delete every app row belonging to the user. */
export async function deleteAllUserData(db: Db, userId: string): Promise<void> {
  assertUser(userId);
  await db.delete(schema.dishFeedback).where(eq(schema.dishFeedback.userId, userId));
  await db.delete(schema.menus).where(eq(schema.menus.userId, userId));
  await db.delete(schema.tasteProfiles).where(eq(schema.tasteProfiles.userId, userId));
}

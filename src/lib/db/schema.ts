import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { DishSnapshot, MenuItemInput, TasteProfile } from "@/lib/domain/schemas";

/**
 * Users live in Neon Auth's `neon_auth` schema. App tables key on its user id (text) without a
 * cross-schema FK, so the app schema can be migrated and tested independently.
 */

export const tasteProfiles = pgTable("taste_profiles", {
  userId: text("user_id").primaryKey(),
  profile: jsonb("profile").$type<TasteProfile>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dishFeedback = pgTable(
  "dish_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    dishKey: text("dish_key").notNull(),
    snapshot: jsonb("snapshot").$type<DishSnapshot>().notNull(),
    saved: boolean("saved").default(false).notNull(),
    tried: boolean("tried").default(false).notNull(),
    rating: smallint("rating"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("dish_feedback_user_dish_idx").on(t.userId, t.dishKey),
    index("dish_feedback_user_updated_idx").on(t.userId, t.updatedAt),
    check("dish_feedback_rating_range", sql`${t.rating} IS NULL OR ${t.rating} BETWEEN 1 AND 5`),
  ],
);

export const menuSource = pgEnum("menu_source", ["scan", "manual", "sample"]);

/** Menus a signed-in user scanned or typed — text only, never the photo. */
export const menus = pgTable(
  "menus",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    source: menuSource("source").notNull(),
    cuisine: text("cuisine"),
    items: jsonb("items").$type<MenuItemInput[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("menus_user_created_idx").on(t.userId, t.createdAt)],
);

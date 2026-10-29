import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { Db } from "./repo";
import * as schema from "./schema";

let db: Db | null | undefined;

/** Drizzle over Neon's HTTP driver (one round trip per query, ideal for serverless). */
export function getDb(): Db | null {
  if (db !== undefined) return db;
  const url = process.env.DATABASE_URL;
  db = url ? (drizzle(neon(url), { schema }) as unknown as Db) : null;
  return db;
}

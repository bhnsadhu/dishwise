import "server-only";
import { ZodError } from "zod";
import { getSessionUser, type SessionUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { LimitError, type Db } from "@/lib/db/repo";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Best-effort per-user write limiter (per server instance). Persistent caps live in the DAL;
 * this only blunts bursts so a runaway client can't burn the free-tier quota.
 */
const buckets = new Map<string, { tokens: number; at: number }>();
function allowWrite(userId: string, capacity = 60, refillPerSec = 1): boolean {
  const now = Date.now();
  const b = buckets.get(userId) ?? { tokens: capacity, at: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.at) / 1000) * refillPerSec);
  b.at = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  buckets.set(userId, b);
  return true;
}

const MAX_BODY = 256 * 1024;

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new RangeError("Request body too large");
  return text ? JSON.parse(text) : {};
}

/** Wrap a handler so it only runs for a signed-in user, with consistent error responses. */
export function withUser(
  handler: (ctx: { user: SessionUser; db: Db; req: Request }) => Promise<Response>,
  opts: { write?: boolean } = {},
) {
  return async (req: Request) => {
    const db = getDb();
    if (!db) return json({ error: "Accounts aren't configured on this deployment." }, 503);
    const user = await getSessionUser();
    if (!user) return json({ error: "Sign in to sync your taste across devices." }, 401);
    if (opts.write && !allowWrite(user.id)) return json({ error: "Too many changes at once. Try again in a minute." }, 429);
    try {
      return await handler({ user, db, req });
    } catch (e) {
      if (e instanceof ZodError) return json({ error: "Some of that data isn't valid.", issues: e.issues.slice(0, 5) }, 400);
      if (e instanceof SyntaxError) return json({ error: "Request body must be JSON." }, 400);
      if (e instanceof RangeError) return json({ error: e.message }, 413);
      if (e instanceof LimitError) return json({ error: e.message }, 409);
      console.error("[api]", e);
      return json({ error: "Something went wrong saving your data." }, 500);
    }
  };
}

export { json };

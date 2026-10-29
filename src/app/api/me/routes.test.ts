import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProfile } from "@/lib/domain/schemas";
import type { Db } from "@/lib/db/repo";
import * as schema from "@/lib/db/schema";

const state: { user: { id: string; email: string | null; name: string | null } | null; db: Db | null } = { user: null, db: null };
vi.mock("@/lib/auth/server", () => ({ getSessionUser: async () => state.user, getAuth: () => null }));
vi.mock("@/lib/db/client", () => ({ getDb: () => state.db }));

const me = await import("./route");
const profile = await import("./profile/route");
const feedback = await import("./feedback/route");

const req = (method: string, body?: unknown, url = "http://test/api/me") =>
  new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(async () => {
  const d = drizzle(new PGlite(), { schema });
  await migrate(d, { migrationsFolder: "./drizzle" });
  state.db = d as unknown as Db;
  state.user = null;
});

describe("/api/me routes", () => {
  it("returns 503 when accounts are not configured", async () => {
    state.db = null;
    expect((await me.GET(req("GET"))).status).toBe(503);
  });

  it("returns an empty guest state for reads and rejects unauthenticated writes", async () => {
    const guest = await me.GET(req("GET"));
    expect(guest.status).toBe(200);
    expect(await guest.json()).toEqual({ user: null, profile: null, feedback: [] });
    expect((await profile.PUT(req("PUT", emptyProfile()))).status).toBe(401);
    expect((await feedback.PUT(req("PUT", {}))).status).toBe(401);
    expect((await me.DELETE(req("DELETE"))).status).toBe(401);
  });

  it("validates input", async () => {
    state.user = { id: "u1", email: null, name: null };
    expect((await profile.PUT(req("PUT", { version: 1, spiceTolerance: 11 }))).status).toBe(400);
    const bad = new Request("http://test/api/me/profile", { method: "PUT", body: "{not json" });
    expect((await profile.PUT(bad)).status).toBe(400);
  });

  it("scopes data to the signed-in user", async () => {
    state.user = { id: "alice", email: "a@example.test", name: null };
    await profile.PUT(req("PUT", { ...emptyProfile(), cuisines: ["thai"] }));
    await feedback.PUT(req("PUT", { dishKey: "m::pho", snapshot: { name: "Pho", ingredients: [], flavors: [] }, rating: 5 }));

    state.user = { id: "mallory", email: null, name: null };
    const res = await (await me.GET(req("GET"))).json();
    expect(res.profile).toBeNull();
    expect(res.feedback).toEqual([]);

    state.user = { id: "alice", email: "a@example.test", name: null };
    const mine = await (await me.GET(req("GET"))).json();
    expect(mine.profile.cuisines).toEqual(["thai"]);
    expect(mine.feedback).toHaveLength(1);
    expect((await me.DELETE(req("DELETE"))).status).toBe(200);
    expect((await (await me.GET(req("GET"))).json()).feedback).toEqual([]);
  });
});

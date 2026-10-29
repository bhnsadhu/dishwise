import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyProfile, type Feedback } from "@/lib/domain/schemas";
import * as repo from "./repo";
import * as schema from "./schema";

// Real Postgres (WASM) running the same migrations we ship to Neon.
let db: repo.Db;
beforeEach(async () => {
  const client = new PGlite();
  const d = drizzle(client, { schema });
  await migrate(d, { migrationsFolder: "./drizzle" });
  db = d as unknown as repo.Db;
});

const fb = (dishKey: string, extra: Partial<Feedback> = {}): Feedback => ({
  dishKey,
  snapshot: { name: dishKey, ingredients: ["pork"], flavors: ["rich"] },
  saved: false,
  tried: true,
  rating: 4,
  ...extra,
});

describe("profiles", () => {
  it("round-trips and updates a profile", async () => {
    expect(await repo.getProfile(db, "alice")).toBeNull();
    await repo.saveProfile(db, "alice", { ...emptyProfile(), cuisines: ["thai"] });
    await repo.saveProfile(db, "alice", { ...emptyProfile(), cuisines: ["korean"] });
    expect((await repo.getProfile(db, "alice"))?.cuisines).toEqual(["korean"]);
  });

  it("rejects invalid profiles", async () => {
    await expect(repo.saveProfile(db, "alice", { version: 1, cuisines: ["atlantis"] })).rejects.toThrow();
    await expect(repo.saveProfile(db, "alice", { version: 1, spiceTolerance: 9 })).rejects.toThrow();
  });
});

describe("feedback", () => {
  it("upserts one row per user and dish", async () => {
    await repo.upsertFeedback(db, "alice", fb("m::ramen", { rating: 3 }));
    await repo.upsertFeedback(db, "alice", fb("m::ramen", { rating: 5, saved: true }));
    const list = await repo.listFeedback(db, "alice");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ rating: 5, saved: true });
  });

  it("deletes the row when nothing is set any more", async () => {
    await repo.upsertFeedback(db, "alice", fb("m::ramen"));
    await repo.upsertFeedback(db, "alice", fb("m::ramen", { rating: null, saved: false, tried: false }));
    expect(await repo.listFeedback(db, "alice")).toEqual([]);
  });

  it("enforces the rating range in the database too", async () => {
    await expect(
      db.insert(schema.dishFeedback).values({ userId: "alice", dishKey: "x", snapshot: fb("x").snapshot, rating: 9 }),
    ).rejects.toThrow();
  });

  it("caps rows per user", async () => {
    const rows = Array.from({ length: repo.LIMITS.feedbackPerUser }, (_, i) => ({
      userId: "alice",
      dishKey: `k${i}`,
      snapshot: fb("x").snapshot,
      rating: 4,
    }));
    await db.insert(schema.dishFeedback).values(rows);
    await expect(repo.upsertFeedback(db, "alice", fb("one-too-many"))).rejects.toBeInstanceOf(repo.LimitError);
    // Updating an existing row is still allowed at the cap
    await expect(repo.upsertFeedback(db, "alice", fb("k1", { rating: 5 }))).resolves.toMatchObject({ rating: 5 });
  });
});

describe("authorization", () => {
  it("never exposes or modifies another user's data", async () => {
    await repo.saveProfile(db, "alice", { ...emptyProfile(), cuisines: ["thai"] });
    await repo.upsertFeedback(db, "alice", fb("m::ramen", { rating: 5 }));
    const menu = await repo.saveMenu(db, "alice", { title: "Alice's menu", items: [{ name: "Pho" }] }, "scan");

    expect(await repo.getProfile(db, "mallory")).toBeNull();
    expect(await repo.listFeedback(db, "mallory")).toEqual([]);
    expect(await repo.listMenus(db, "mallory")).toEqual([]);
    expect(await repo.getMenu(db, "mallory", menu.id)).toBeNull();

    await repo.deleteFeedback(db, "mallory", "m::ramen");
    await repo.deleteAllUserData(db, "mallory");
    expect(await repo.listFeedback(db, "alice")).toHaveLength(1);
    expect(await repo.getMenu(db, "alice", menu.id)).not.toBeNull();
  });

  it("refuses calls without a user id", async () => {
    await expect(repo.listFeedback(db, "")).rejects.toThrow();
  });
});

describe("guest merge", () => {
  it("keeps the account profile when one exists, otherwise adopts the guest's", async () => {
    await repo.mergeGuestData(db, "bob", { profile: { ...emptyProfile(), cuisines: ["mexican"] } });
    expect((await repo.getProfile(db, "bob"))?.cuisines).toEqual(["mexican"]);
    await repo.mergeGuestData(db, "bob", { profile: { ...emptyProfile(), cuisines: ["french"] } });
    expect((await repo.getProfile(db, "bob"))?.cuisines).toEqual(["mexican"]);
  });

  it("merges feedback with newest-wins and ignores invalid rows", async () => {
    await repo.upsertFeedback(db, "bob", fb("a", { rating: 2 }));
    const { feedback } = await repo.mergeGuestData(db, "bob", {
      feedback: [
        fb("a", { rating: 5, updatedAt: new Date(Date.now() + 60_000).toISOString() }),
        fb("b", { rating: 4, updatedAt: new Date().toISOString() }),
        { dishKey: "bad", rating: 99 },
      ],
    });
    expect(feedback.map((f) => [f.dishKey, f.rating]).sort()).toEqual([["a", 5], ["b", 4]]);
  });

  it("does not let an older guest rating overwrite a newer account rating", async () => {
    await repo.upsertFeedback(db, "bob", fb("a", { rating: 2 }));
    await repo.mergeGuestData(db, "bob", { feedback: [fb("a", { rating: 5, updatedAt: "2020-01-01T00:00:00.000Z" })] });
    expect((await repo.listFeedback(db, "bob"))[0].rating).toBe(2);
  });
});

describe("account deletion", () => {
  it("removes all of a user's rows", async () => {
    await repo.saveProfile(db, "carol", emptyProfile());
    await repo.upsertFeedback(db, "carol", fb("x"));
    await repo.saveMenu(db, "carol", { title: "M", items: [{ name: "Tacos" }] }, "manual");
    await repo.deleteAllUserData(db, "carol");
    expect(await repo.getProfile(db, "carol")).toBeNull();
    expect(await repo.listFeedback(db, "carol")).toEqual([]);
    expect(await repo.listMenus(db, "carol")).toEqual([]);
  });

  it("keeps menu history bounded", async () => {
    for (let i = 0; i < repo.LIMITS.menusPerUser + 2; i++) {
      await repo.saveMenu(db, "dan", { title: `M${i}`, items: [{ name: "Dish" }] }, "manual");
    }
    expect(await repo.listMenus(db, "dan")).toHaveLength(repo.LIMITS.menusPerUser);
  });
});

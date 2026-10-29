import { json, readJson, withUser } from "@/lib/api";
import { deleteFeedback, upsertFeedback } from "@/lib/db/repo";

export const PUT = withUser(async ({ user, db, req }) => json({ feedback: await upsertFeedback(db, user.id, await readJson(req)) }), { write: true });

export const DELETE = withUser(
  async ({ user, db, req }) => {
    const dishKey = new URL(req.url).searchParams.get("dishKey");
    if (!dishKey) return json({ error: "Missing dishKey." }, 400);
    await deleteFeedback(db, user.id, dishKey.slice(0, 200));
    return json({ ok: true });
  },
  { write: true },
);

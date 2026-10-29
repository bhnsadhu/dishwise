import { json, readJson, withUser } from "@/lib/api";
import { saveProfile } from "@/lib/db/repo";

export const PUT = withUser(async ({ user, db, req }) => json({ profile: await saveProfile(db, user.id, await readJson(req)) }), { write: true });

import { json, withUser } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { deleteAllUserData, getProfile, listFeedback } from "@/lib/db/repo";

/**
 * The signed-in user's profile and feedback. Being signed out is a normal state for this read, so
 * guests get 200 `{ user: null }` rather than a 401 (writes still require a session).
 */
export async function GET(req: Request) {
  if (!getDb()) return json({ error: "Accounts aren't configured on this deployment." }, 503);
  if (!(await getSessionUser())) return json({ user: null, profile: null, feedback: [] });
  return readMe(req);
}

const readMe = withUser(async ({ user, db }) => {
  const [profile, feedback] = await Promise.all([getProfile(db, user.id), listFeedback(db, user.id)]);
  return json({ user: { email: user.email, name: user.name }, profile, feedback });
});

/** Delete all of the user's Dishwise data. The sign-in account itself is deleted client-side via Neon Auth. */
export const DELETE = withUser(
  async ({ user, db }) => {
    await deleteAllUserData(db, user.id);
    return json({ dataDeleted: true });
  },
  { write: true },
);

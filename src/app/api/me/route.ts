import { json, withUser } from "@/lib/api";
import { deleteAllUserData, getProfile, listFeedback } from "@/lib/db/repo";

/** The signed-in user's profile and feedback. */
export const GET = withUser(async ({ user, db }) => {
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

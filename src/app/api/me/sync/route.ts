import { json, readJson, withUser } from "@/lib/api";
import { mergeGuestData } from "@/lib/db/repo";

/** First sign-in: merge the guest's local profile and feedback into the account. */
export const POST = withUser(
  async ({ user, db, req }) => {
    const body = (await readJson(req)) as { profile?: unknown; feedback?: unknown };
    const feedback = Array.isArray(body.feedback) ? body.feedback : [];
    return json(await mergeGuestData(db, user.id, { profile: body.profile, feedback }));
  },
  { write: true },
);

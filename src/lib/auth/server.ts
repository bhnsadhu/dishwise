import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;
let instance: NeonAuth | null | undefined;

/**
 * Neon Auth instance, or null when auth isn't configured (local dev without env, CI).
 * Dishwise then runs guest-only instead of failing to build.
 */
export function getAuth(): NeonAuth | null {
  if (instance !== undefined) return instance;
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  instance = baseUrl && secret && secret.length >= 32 ? createNeonAuth({ baseUrl, cookies: { secret } }) : null;
  return instance;
}

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** The signed-in user, narrowed to what the app needs, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const auth = getAuth();
  if (!auth) return null;
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user?.id) return null;
  return { id: String(user.id), email: user.email ?? null, name: user.name ?? null };
}

import { expect, test, type Page } from "@playwright/test";

/**
 * Account flows with the auth + account APIs faked inside the browser (page.route), so no request
 * ever reaches Neon. Covers the client wiring end to end: sign up / in / out, guest-data merge,
 * write-through sync, error states and deletion. Server-side persistence and user isolation are
 * covered separately by integration tests against real Postgres (src/lib/db, src/app/api).
 */

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "taster@dishwise.test", name: "Taster" };
const PASSWORD = "e2e-password-4821";

interface Fake {
  signedIn: boolean;
  requireVerification: boolean;
  failFeedback: boolean;
  calls: { method: string; path: string; body: unknown }[];
  serverProfile: unknown;
  serverFeedback: unknown[];
}

async function fakeBackend(page: Page, opts: Partial<Fake> = {}): Promise<Fake> {
  const f: Fake = { signedIn: false, requireVerification: false, failFeedback: false, calls: [], serverProfile: null, serverFeedback: [], ...opts };
  const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route(/\/api\/(auth|me)(\/|$|\?)/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {}
    f.calls.push({ method: req.method(), path, body });

    if (path.endsWith("/sign-up/email")) {
      if (!f.requireVerification) f.signedIn = true;
      return route.fulfill(json({ token: f.requireVerification ? null : "t", user: USER }));
    }
    if (path.endsWith("/sign-in/email")) {
      const b = body as { password?: string };
      if (b?.password !== PASSWORD) return route.fulfill(json({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }, 401));
      f.signedIn = true;
      return route.fulfill(json({ token: "t", user: USER }));
    }
    if (path.endsWith("/sign-out")) {
      f.signedIn = false;
      return route.fulfill(json({ success: true }));
    }
    if (path.endsWith("/delete-user")) return route.fulfill(json({ success: true }));
    if (path.startsWith("/api/auth/")) return route.fulfill(json(f.signedIn ? { user: USER, session: { id: "s" } } : null));

    if (path === "/api/me" && req.method() === "GET") {
      return route.fulfill(json(f.signedIn ? { user: { email: USER.email, name: USER.name }, profile: f.serverProfile, feedback: f.serverFeedback } : { user: null, profile: null, feedback: [] }));
    }
    if (!f.signedIn) return route.fulfill(json({ error: "Sign in to sync your taste across devices." }, 401));
    if (path === "/api/me/sync") {
      const b = body as { profile?: unknown; feedback?: unknown[] };
      f.serverProfile = f.serverProfile ?? b.profile ?? null;
      f.serverFeedback = b.feedback ?? [];
      return route.fulfill(json({ profile: f.serverProfile, feedback: f.serverFeedback }));
    }
    if (path === "/api/me/profile") {
      f.serverProfile = body;
      return route.fulfill(json({ profile: body }));
    }
    if (path === "/api/me/feedback") {
      if (f.failFeedback) return route.fulfill(json({ error: "Something went wrong saving your data." }, 500));
      return route.fulfill(json({ feedback: body }));
    }
    if (path === "/api/me/menus") return route.fulfill(json({ menu: { id: "m" } }));
    if (path === "/api/me" && req.method() === "DELETE") {
      f.serverProfile = null;
      f.serverFeedback = [];
      return route.fulfill(json({ dataDeleted: true }));
    }
    return route.fulfill(json({ error: "unexpected" }, 404));
  });
  return f;
}

const signUp = async (page: Page) => {
  await page.goto("/account");
  await page.getByRole("tab", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).last().click();
};

test("sign up merges the guest's taste and ratings into the new account", async ({ page }) => {
  const f = await fakeBackend(page);
  // As a guest: mark a taste and rate a dish.
  await page.goto("/taste");
  await page.getByRole("button", { name: "tofu: no preference" }).click();
  await page.goto("/m/lantern-noodle-bar");
  await page.getByRole("button", { name: /^Edamame\. Score/ }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "4 stars" }).click();
  await page.keyboard.press("Escape");

  await signUp(page);
  await expect(page.getByText(`Signed in as ${USER.email}`)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Account created");
  const sync = f.calls.find((c) => c.path === "/api/me/sync")!.body as { profile: { likedIngredients: string[] }; feedback: { snapshot: { name: string }; rating: number }[] };
  expect(sync.profile.likedIngredients).toContain("tofu");
  expect(sync.feedback).toEqual([expect.objectContaining({ rating: 4, snapshot: expect.objectContaining({ name: "Edamame" }) })]);
});

test("signed-in changes write through to the account", async ({ page }) => {
  const f = await fakeBackend(page, { signedIn: true });
  await page.goto("/taste");
  await page.getByRole("button", { name: "mushroom: no preference" }).click();
  await expect.poll(() => (f.serverProfile as { likedIngredients?: string[] } | null)?.likedIngredients ?? []).toContain("mushroom");

  await page.goto("/m/nonna-fig");
  await page.getByRole("button", { name: /^Margherita\. Score/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => f.calls.filter((c) => c.path === "/api/me/feedback" && c.method === "PUT").length).toBe(1);
  const put = f.calls.find((c) => c.path === "/api/me/feedback")!.body as { saved: boolean; snapshot: { name: string } };
  expect(put).toMatchObject({ saved: true, snapshot: { name: "Margherita" } });
});

test("account data loads on a fresh device", async ({ page }) => {
  await fakeBackend(page, {
    signedIn: true,
    serverProfile: { version: 1, cuisines: ["thai"], favoriteFoods: [], likedIngredients: ["beef"], dislikedIngredients: [], likedFlavors: [], dislikedFlavors: [], spiceTolerance: 3, diet: "none", restrictions: [], budget: "any" },
  });
  await page.goto("/taste");
  await expect(page.getByRole("button", { name: "beef: love" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thai: selected" })).toBeVisible();
});

test("wrong password shows the error and stays signed out", async ({ page }) => {
  await fakeBackend(page);
  await page.goto("/account");
  await page.getByLabel("Email").fill(USER.email);
  await page.getByLabel("Password").fill("not-the-password-1");
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByText(/Signed in as/)).toHaveCount(0);
});

test("sign up that needs email confirmation says so instead of claiming success", async ({ page }) => {
  await fakeBackend(page, { requireVerification: true });
  await signUp(page);
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await expect(page.getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");
});

test("sign out returns to guest mode and keeps a local copy", async ({ page }) => {
  const f = await fakeBackend(page, { signedIn: true });
  await page.goto("/account");
  await expect(page.getByText(`Signed in as ${USER.email}`)).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("status")).toContainText("Signed out");
  await expect(page.getByLabel("Email")).toBeVisible();
  expect(f.calls.some((c) => c.path.endsWith("/sign-out"))).toBe(true);
});

test("a failed sync is shown, not swallowed", async ({ page }) => {
  await fakeBackend(page, { signedIn: true, failFeedback: true });
  await page.goto("/m/casa-comal");
  await page.getByRole("button", { name: /^Churros\. Score/ }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "5 stars" }).click();
  await page.keyboard.press("Escape");
  // Navigate client-side so the in-memory sync error survives.
  await page.getByRole("link", { name: /^(Account|You)$/ }).filter({ visible: true }).first().click();
  await expect(page.getByRole("alert").filter({ hasText: /saving your data/ })).toBeVisible();
});

test("delete asks first, then removes account data and the sign-in account", async ({ page }) => {
  const f = await fakeBackend(page, { signedIn: true, serverFeedback: [] });
  await page.goto("/account");
  await page.getByRole("button", { name: /Delete my account and data/ }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(f.calls.some((c) => c.method === "DELETE")).toBe(false);
  await page.getByRole("button", { name: /Delete my account and data/ }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByRole("status")).toContainText("deleted");
  expect(f.calls.some((c) => c.path === "/api/me" && c.method === "DELETE")).toBe(true);
  expect(f.calls.some((c) => c.path.endsWith("/delete-user"))).toBe(true);
  await page.goto("/notebook");
  await expect(page.getByText("nothing here yet")).toBeVisible();
});

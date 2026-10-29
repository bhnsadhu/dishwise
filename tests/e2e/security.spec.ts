import { expect, test } from "@playwright/test";

test.describe("API authorization", () => {
  test("rejects unauthenticated access to personal data", async ({ request }) => {
    const me = await request.get("/api/me");
    expect([401, 503]).toContain(me.status());
    for (const [method, path] of [
      ["PUT", "/api/me/profile"],
      ["PUT", "/api/me/feedback"],
      ["POST", "/api/me/sync"],
      ["POST", "/api/me/menus"],
      ["DELETE", "/api/me"],
    ] as const) {
      const res = await request.fetch(path, { method, data: {} });
      expect([401, 503], `${method} ${path}`).toContain(res.status());
    }
  });

  test("never caches personal responses", async ({ request }) => {
    const me = await request.get("/api/me");
    expect(me.headers()["cache-control"]).toContain("no-store");
  });
});

// Real account round-trip. Needs a test account you create yourself:
//   E2E_EMAIL=... E2E_PASSWORD=... npx playwright test security
test("signed-in data persists across sessions", async ({ browser }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to run the account test.");
  const signIn = async () => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/account");
    await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).last().click();
    await expect(page.getByText(/Signed in as/)).toBeVisible();
    return { ctx, page };
  };
  const a = await signIn();
  await a.page.goto("/taste");
  const word = a.page.getByRole("button", { name: /^lamb: / });
  if (!(await word.getAttribute("aria-label"))?.includes("love")) await word.click();
  await a.page.waitForTimeout(1500);
  await a.ctx.close();

  const b = await signIn();
  await b.page.goto("/taste");
  await expect(b.page.getByRole("button", { name: "lamb: love" })).toBeVisible();
  await b.ctx.close();
});

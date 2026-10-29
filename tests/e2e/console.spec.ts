import { expect, test } from "@playwright/test";

// Every page loads without console errors, page errors or failed same-origin requests.
for (const path of ["/", "/taste", "/menus", "/m/nonna-fig", "/m/local-missing", "/scan", "/scan?mode=type", "/notebook", "/how", "/account", "/does-not-exist"]) {
  test(`clean console on ${path}`, async ({ page, baseURL }) => {
    const problems: string[] = [];
    page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("response", (r) => {
      const ownOrigin = r.url().startsWith(baseURL!);
      if (ownOrigin && r.status() >= 400 && !(path === "/does-not-exist" && r.url().endsWith(path))) problems.push(`${r.status()} ${r.url()}`);
    });
    const res = await page.goto(path);
    if (path === "/does-not-exist") expect(res?.status()).toBe(404);
    await page.waitForLoadState("networkidle");
    expect(problems.filter((p) => !(path === "/does-not-exist" && /404/.test(p)))).toEqual([]);
  });
}

test("metadata, icons, robots and sitemap are served", async ({ request }) => {
  for (const [p, type] of [["/icon", "image/png"], ["/apple-icon", "image/png"], ["/opengraph-image", "image/png"], ["/robots.txt", "text/plain"], ["/sitemap.xml", "xml"]] as const) {
    const r = await request.get(p);
    expect(r.status(), p).toBe(200);
    expect(r.headers()["content-type"], p).toContain(type);
  }
  const html = await (await request.get("/")).text();
  expect(html).toContain('property="og:image"');
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const scan = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
};

for (const path of ["/", "/taste", "/menus", "/m/nonna-fig", "/scan", "/scan?mode=type", "/notebook", "/how", "/account"]) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await scan(page)).toEqual([]);
  });
}

test("no violations with the dish sheet open", async ({ page }) => {
  await page.goto("/m/lantern-noodle-bar");
  await page.getByRole("button", { name: /^Pork Gyoza\. Score/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await scan(page)).toEqual([]);
});

test("no violations on the scan review screen", async ({ page }) => {
  await page.goto("/scan?mode=type");
  await page.getByLabel(/Paste a menu/).fill("Pho  $14\nbeef broth, rice noodles");
  await page.getByRole("button", { name: /Read these dishes/ }).click();
  await expect(page.getByRole("heading", { name: "Check your dishes" })).toBeVisible();
  expect(await scan(page)).toEqual([]);
});

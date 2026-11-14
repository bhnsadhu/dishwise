import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test("restaurant search explains its coverage and gives an empty-search recovery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find a restaurant", exact: true }).click();
  const section = page.getByRole("region", { name: "Find a restaurant menu" });
  await expect(section).toContainText("5 restaurants");
  const input = page.getByRole("searchbox", { name: "Restaurant, city or cuisine" });
  await input.fill("not in the directory");
  await expect(section.getByRole("heading", { name: "That restaurant isn’t in Dishwise yet" })).toBeVisible();
  await expect(section.getByRole("link", { name: "Paste a menu" })).toHaveAttribute("href", "/scan?mode=type");
  await section.getByRole("button", { name: "Clear search" }).click();
  await expect(input).toHaveValue("");
  await input.fill("CHAMPAIGN watson's");
  await expect(section.getByRole("link", { name: "Rank the menu at Watson’s at The Yard" })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    // Apply the saved theme before first paint, rather than measuring halfway through a color transition.
    await page.evaluate(theme => localStorage.setItem("dw-theme", theme), theme);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const result = await new AxeBuilder({ page }).include("#restaurants").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

const scoreOf = async (page: Page) => {
  const label = await page.getByRole("button", { name: /^TOFU PO’BOY\. Score/ }).getAttribute("aria-label");
  return Number(label?.match(/Score (\d+)/)?.[1]);
};

for (const restaurant of [
  { id: "kohinoor", name: "Kohinoor", count: 138, dish: /^CHANA SAAG\. Score/, price: "$13.99", option: "Vegan preparation available upon request.", note: /Dinner food menu/ },
  { id: "kofusion-downtown", name: "KoFusion Downtown", count: 24, dish: /^Panang Curry\. Score/, option: /Protein choice: tofu, chicken, shrimp/i, note: /This source does not list prices/ },
  { id: "fiesta-cafe", name: "Fiesta Cafe", count: 21, dish: /^Enchilada Lunch\. Score/, price: "$10.95", option: /Your choice of meats/, note: /weekdays, 11am to 5pm/ },
  { id: "jupiters-downtown", name: "Jupiter’s Downtown", count: 28, dish: /^BBQ Chicken grinder\. Score/, price: "$10.75", option: /Add Onions and Jalapeños For/, note: /Build-your-own pizzas/ },
]) {
  test(`reviewed menu at ${restaurant.name} preserves prices, choices and source scope`, async ({ page }) => {
    test.skip(process.env.TEST_LIVE_RESTAURANT !== "1", "Opt in to current public menus.");
    await page.goto(`/restaurants/${restaurant.id}`);
    await expect(page.getByRole("heading", { level: 1, name: restaurant.name })).toBeVisible();
    await expect(page.getByText(`${restaurant.count} dishes`, { exact: true })).toBeVisible();
    await expect(page.getByText(restaurant.note)).toBeVisible();
    await page.getByRole("button", { name: restaurant.dish }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Why this score")).toBeVisible();
    if (restaurant.price) await expect(dialog).toContainText(restaurant.price);
    await expect(dialog.getByText(restaurant.option, { exact: false })).toBeVisible();
    await expect(dialog.getByText("Choices and add-ons, not included in this score:")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Measure the final colors after the sheet's opacity animation, even on a busy test runner.
    await dialog.evaluate(async node => {
      await Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  });
}

test("live restaurant menu supports taste, source details, rating and saving", async ({ page }) => {
  test.skip(process.env.TEST_LIVE_RESTAURANT !== "1", "Opt in to the real restaurant source with TEST_LIVE_RESTAURANT=1.");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Restaurant, city or cuisine" }).fill("Urbana");
  const link = page.getByRole("link", { name: "Rank the menu at Watson’s at The Yard" });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Watson’s at The Yard" })).toBeVisible();
  await expect(page.getByText("Restaurant menu", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /View restaurant menu/ })).toHaveAttribute("href", "https://www.watsonschicken.com/the-yard");
  await expect(page.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}T/);
  await expect(page.getByText("$10 small / $16 large", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Typed on this device|fictional restaurant/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Additions\./ })).toHaveCount(0);
  const before = await scoreOf(page);
  await page.goto("/taste");
  await page.getByRole("button", { name: "tofu: no preference" }).click();
  await page.goto("/restaurants/watsons-the-yard");
  await expect.poll(() => scoreOf(page)).toBeGreaterThan(before);
  await page.getByRole("button", { name: /^TOFU PO’BOY\. Score/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Why this score")).toBeVisible();
  await dialog.getByRole("radio", { name: "5 stars" }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.goto("/notebook");
  await expect(page.getByText("TOFU PO’BOY").first()).toBeVisible();
  await page.goto("/restaurants/watsons-the-yard");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => localStorage.setItem("dw-theme", theme), theme);
    await page.reload();
    await expect(page.getByRole("button", { name: /^TOFU PO’BOY\. Score/ })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

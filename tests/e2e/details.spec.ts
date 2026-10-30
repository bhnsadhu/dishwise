import { expect, test, type Page } from "@playwright/test";

const scoreOf = async (page: Page, dish: string) => {
  const label = await page.getByRole("button", { name: new RegExp(`^${dish}\\. Score \\d+`) }).first().getAttribute("aria-label");
  return Number(label?.match(/Score (\d+)/)?.[1]);
};

test("home ranks for an example taste until you set your own", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Ranked for an example taste/)).toBeVisible();
  await page.goto("/taste");
  await page.getByRole("button", { name: "olives: no preference" }).click();
  await page.goto("/");
  await expect(page.getByText("Ranked for your taste")).toBeVisible();
  await expect(page.getByText(/Ranked for an example taste/)).toHaveCount(0);
});

test("clearing the taste card asks first, then resets everything", async ({ page }) => {
  await page.goto("/taste");
  await page.getByRole("button", { name: "Korean: no preference" }).click();
  await page.getByRole("radio", { name: "Vegan" }).click();
  await page.getByRole("button", { name: "Reset taste" }).click();
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByRole("button", { name: "Korean: selected" })).toBeVisible();
  await page.getByRole("button", { name: "Reset taste" }).click();
  await page.getByRole("button", { name: "Yes, clear it" }).click();
  await expect(page.getByRole("button", { name: "Korean: no preference" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "No set diet" })).toHaveAttribute("aria-checked", "true");
});

test("diet and budget choices change results", async ({ page }) => {
  await page.goto("/taste");
  await page.getByRole("radio", { name: "Vegetarian" }).click();
  await page.goto("/m/little-mezze");
  await expect(page.getByRole("button", { name: /^Lamb Kofta\. Held back/ })).toBeVisible();

  await page.goto("/taste");
  await page.getByRole("radio", { name: "No set diet" }).click();
  await page.goto("/m/nonna-fig");
  const before = await scoreOf(page, "Lobster Linguine");
  await page.goto("/taste");
  await page.getByRole("radio", { name: "Keep it affordable" }).click();
  await page.goto("/m/nonna-fig");
  expect(await scoreOf(page, "Lobster Linguine")).toBeLessThan(before);
});

test("favourite dishes can be added and removed", async ({ page }) => {
  await page.goto("/taste");
  await page.getByLabel("Add a favourite dish").fill("Ramen");
  await page.getByLabel("Add a favourite dish").press("Enter");
  await expect(page.getByRole("button", { name: "Remove ramen" })).toBeVisible();
  await page.goto("/m/lantern-noodle-bar");
  const picks = page.getByRole("region", { name: "Top picks for you" }).filter({ visible: true }).first();
  await expect(picks.getByRole("listitem").first()).toContainText("Ramen");
  await page.goto("/taste");
  await page.getByRole("button", { name: "Remove ramen" }).click();
  await expect(page.getByRole("button", { name: "Remove ramen" })).toHaveCount(0);
});

test("manual form: validation, skipped lines, saved menu list and removal", async ({ page }) => {
  await page.goto("/scan?mode=type");
  await page.getByRole("button", { name: "or fill in a form" }).click();
  await page.getByRole("button", { name: /Rank these dishes/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Add at least one dish name" })).toBeVisible();

  await page.getByLabel("Restaurant").fill("Test Kitchen");
  await page.getByLabel("Dish 1 name").fill("Mushroom Toast");
  await page.getByLabel("Dish 1 price").fill("$12.50");
  await page.getByRole("button", { name: "Remove dish 3" }).click();
  await page.getByRole("button", { name: /Rank these dishes/ }).click();
  await expect(page.getByRole("heading", { name: "Test Kitchen" })).toBeVisible();
  await expect(page.getByText("$12.50").filter({ visible: true }).first()).toBeVisible();

  await page.goto("/menus");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: /Test Kitchen/ })).toBeVisible();
  await page.getByRole("button", { name: "Remove Test Kitchen" }).click();
  await expect(page.getByRole("link", { name: /Test Kitchen/ })).toHaveCount(0);
});

test("lines the parser skipped can be added back as dishes", async ({ page }) => {
  await page.goto("/scan?mode=type");
  await page.getByLabel(/Paste a menu/).fill("Burger $15\nwww.example-restaurant.test\nFries $6");
  await page.getByRole("button", { name: /Read these dishes/ }).click();
  await page.getByText(/line we skipped/).click();
  await page.getByRole("button", { name: "add as dish" }).click();
  await expect(page.getByLabel("Dish 3 name")).toHaveValue("www.example-restaurant.test");
});

test("unknown menu id explains where menus live", async ({ page }) => {
  await page.goto("/m/local-00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: "Menu not found" })).toBeVisible();
});

test("a photo with no text says so instead of inventing dishes", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/scan");
  await page.getByTestId("menu-file").setInputFiles("tests/ocr/images/blank.png");
  await expect(page.getByRole("alert").filter({ hasText: /Couldn't find any text|couldn't tell which lines/ })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Dish 1 name")).toHaveValue("");
});

test("if the text reader can't download, the user gets a clear way forward", async ({ page }) => {
  await page.route(/jsdelivr|tessdata|unpkg/, (route) => route.abort());
  await page.goto("/scan");
  await page.getByTestId("menu-file").setInputFiles("tests/ocr/images/clean.png");
  await expect(page.getByRole("alert").filter({ hasText: /Reading the photo failed/ })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: "Choose a photo" })).toBeVisible();
});

test("ratings can be edited from the notebook and change rankings", async ({ page }) => {
  await page.goto("/m/casa-comal");
  await page.getByRole("button", { name: /^Baja Fish Tacos\. Score/ }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "2 stars" }).click();
  await page.keyboard.press("Escape");
  const low = await scoreOf(page, "Baja Fish Tacos");

  await page.goto("/notebook");
  await page.getByRole("radiogroup", { name: "Rating for Baja Fish Tacos" }).getByRole("radio", { name: "5 stars" }).click();
  await page.goto("/m/casa-comal");
  expect(await scoreOf(page, "Baja Fish Tacos")).toBeGreaterThan(low);
});

test("dish sheet closes with Escape and by clicking outside, and traps focus", async ({ page }) => {
  await page.goto("/m/lantern-noodle-bar");
  await page.getByRole("button", { name: /^Edamame\. Score/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: /^Edamame\. Score/ }).click();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
});

test("tapping anywhere on a dish card opens it", async ({ page }) => {
  await page.goto("/m/lantern-noodle-bar");
  const card = page.locator("li").filter({ has: page.getByRole("button", { name: /^Edamame\. Score/ }) });
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.click(box.x + box.width - 12, box.y + box.height - 12);
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Edamame" })).toBeVisible();
});

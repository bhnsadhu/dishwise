import { expect, test, type Page } from "@playwright/test";

const scoreOf = async (page: Page, dish: string) => {
  const label = await page.getByRole("button", { name: new RegExp(`^${dish}\\. Score \\d+`) }).first().getAttribute("aria-label");
  return Number(label?.match(/Score (\d+)/)?.[1]);
};

test("home shows a ranked example menu without sign-up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What should I order?" })).toBeVisible();
  await expect(page.getByText(/Ranked for an example taste/)).toBeVisible();
  await expect(page.getByText(/^\d+% match$/).first()).toBeVisible();
  await expect(page.getByText(/^(Contains|Usually has) shellfish$/)).toBeVisible();
  await page.getByRole("link", { name: "See the whole menu ranked" }).click();
  await expect(page.getByRole("heading", { name: "Lantern Noodle Bar" })).toBeVisible();
});

test("guest taste card persists and changes the ranking", async ({ page }) => {
  await page.goto("/m/lantern-noodle-bar");
  const before = await scoreOf(page, "Salmon Teriyaki Don");

  await page.goto("/taste");
  await page.getByRole("button", { name: "salmon: no preference" }).click();
  await expect(page.getByRole("button", { name: "salmon: love" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "salmon: love" })).toBeVisible();

  await page.goto("/m/lantern-noodle-bar");
  expect(await scoreOf(page, "Salmon Teriyaki Don")).toBeGreaterThan(before);
});

test("allergy restriction holds back conflicting dishes and asks to confirm", async ({ page }) => {
  await page.goto("/taste");
  await page.locator("label", { hasText: /^shellfish$/ }).click();
  await expect(page.getByRole("checkbox", { name: "shellfish" })).toBeChecked();
  await page.goto("/m/lantern-noodle-bar");
  await expect(page.getByText(/(Contains|Usually has) shellfish/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Shrimp Tempura\. Held back/ })).toBeVisible();
  await expect(page.getByText(/confirm with the staff/i).filter({ visible: true }).first()).toBeVisible();
});

test("rating a dish re-ranks and the dish lands in the notebook", async ({ page }) => {
  await page.goto("/m/saffron-steps");
  const before = await scoreOf(page, "Palak Paneer");
  await page.getByRole("button", { name: /^Palak Paneer\. Score/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Palak Paneer" })).toBeVisible();
  await expect(dialog.getByText("Why this score")).toBeVisible();
  await dialog.getByRole("radio", { name: "5 stars" }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  expect(await scoreOf(page, "Palak Paneer")).toBeGreaterThan(before);

  await page.goto("/notebook");
  await expect(page.getByRole("heading", { name: /^Saved dishes/ })).toBeVisible();
  await expect(page.getByText("Palak Paneer").first()).toBeVisible();
  await page.getByRole("button", { name: "Forget Palak Paneer" }).first().click();
  await expect(page.getByText("nothing here yet")).toBeVisible();
});

test("typed menu goes through review and gets ranked", async ({ page }) => {
  await page.goto("/scan?mode=type");
  await page.getByLabel(/Paste a menu/).fill("MAINS\nSpicy Pork Ramen  $16\nmiso broth, chili oil, egg\nGarden Salad  $11\nlettuce, cucumber, lemon");
  await page.getByRole("button", { name: /Read these dishes/ }).click();
  await expect(page.getByRole("heading", { name: "Check your dishes" })).toBeVisible();
  await expect(page.getByLabel("Dish 1 name")).toHaveValue("Spicy Pork Ramen");
  await page.getByLabel("Dish 2 name").fill("Garden Salad Bowl");
  await page.getByRole("button", { name: /Rank these dishes/ }).click();
  await expect(page).toHaveURL(/\/m\/local-/);
  await expect(page.getByRole("button", { name: /^Spicy Pork Ramen\. Score/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Garden Salad Bowl\. Score/ })).toBeVisible();
});

test("photo upload runs real OCR in the browser and finds dishes and prices", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/scan");
  await page.getByTestId("menu-file").setInputFiles("tests/ocr/images/clean.png");
  await expect(page.getByRole("heading", { name: "Check what we read" })).toBeVisible({ timeout: 90_000 });
  const names = await page.getByLabel(/Dish \d+ name/).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(names).toEqual(expect.arrayContaining(["Charred Corn Soup", "Roast Chicken", "Mushroom Risotto"]));
  const idx = names.indexOf("Roast Chicken");
  await expect(page.getByLabel(`Dish ${idx + 1} price`)).toHaveValue("$24");
  await page.getByRole("button", { name: /Rank these dishes/ }).click();
  await expect(page.getByRole("button", { name: /^Roast Chicken\. Score/ })).toBeVisible();
});

test("a non-image upload is rejected with a helpful message", async ({ page }) => {
  await page.goto("/scan");
  await page.getByTestId("menu-file").setInputFiles({ name: "menu.txt", mimeType: "text/plain", buffer: Buffer.from("not an image") });
  await expect(page.getByRole("alert").filter({ hasText: "isn't an image" })).toBeVisible();
});

test("taste words work from the keyboard", async ({ page }) => {
  await page.goto("/taste");
  const word = page.getByRole("button", { name: "tofu: no preference" });
  await word.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "tofu: love" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "tofu: avoid" })).toBeVisible();
});

test("the dish sheet doesn't slide in with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/m/lantern-noodle-bar");
  await page.getByRole("button", { name: /^Edamame\. Score/ }).click();
  const duration = await page.getByRole("dialog").evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(duration).toBeLessThanOrEqual(0.001);
  await ctx.close();
});

test("no page scrolls sideways", async ({ page }) => {
  for (const path of ["/", "/taste", "/menus", "/m/nonna-fig", "/scan", "/notebook", "/how", "/account"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("the source code is one click from the home page", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: /repository on GitHub/i }).filter({ visible: true });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute("href", "https://github.com/bhnsadhu/dishwise");
});

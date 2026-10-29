import { expect, test, type Page } from "@playwright/test";

const scoreOf = async (page: Page, dish: string) => {
  const label = await page.getByRole("button", { name: new RegExp(`^${dish}\\. Score \\d+`) }).first().getAttribute("aria-label");
  return Number(label?.match(/Score (\d+)/)?.[1]);
};

test("home shows a marked-up example menu without sign-up", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What should I order?" })).toBeVisible();
  await expect(page.getByText("marked for an example taste")).toBeVisible();
  await expect(page.getByRole("button", { name: /pick number 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Held back/ }).first()).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /Held back/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Shrimp Tempura\. Held back/ })).toBeVisible();
  await expect(page.getByText(/confirm with the staff/i)).toBeVisible();
});

test("rating a dish re-ranks and the dish lands in the notebook", async ({ page }) => {
  await page.goto("/m/saffron-steps");
  const before = await scoreOf(page, "Palak Paneer");
  await page.getByRole("button", { name: /^Palak Paneer\. Score/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Palak Paneer" })).toBeVisible();
  await expect(dialog.getByText("Why this score")).toBeVisible();
  await dialog.getByRole("radio", { name: "5 stars" }).click();
  await dialog.getByRole("button", { name: "♡ Save" }).click();
  await page.keyboard.press("Escape");
  expect(await scoreOf(page, "Palak Paneer")).toBeGreaterThan(before);

  await page.goto("/notebook");
  await expect(page.getByRole("heading", { name: /Saved/ })).toBeVisible();
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
  await page.getByRole("button", { name: /Mark up this menu/ }).click();
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
  await page.getByRole("button", { name: /Mark up this menu/ }).click();
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

test("pen strokes don't animate with reduced motion", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  const anim = await page.locator(".pen-stroke path").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
  await ctx.close();
});

test("no page scrolls sideways", async ({ page }) => {
  for (const path of ["/", "/taste", "/menus", "/m/nonna-fig", "/scan", "/notebook", "/how", "/account"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

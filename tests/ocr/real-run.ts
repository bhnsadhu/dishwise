/** Run real menu photos (tests/ocr/real/*.jpg, not committed) through the deployed scan UI and dump the review rows. */
import { readdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.BASE_URL ?? "https://dishwise.bhanusadhu.com";
const dir = "tests/ocr/real";
const b = await chromium.launch();
const out: Record<string, unknown> = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith(".jpg")).sort()) {
  const p = await b.newPage();
  await p.goto(base + "/scan");
  const t0 = Date.now();
  await p.getByTestId("menu-file").setInputFiles(`${dir}/${f}`);
  await p.getByRole("heading", { name: /Check what we read|Check your dishes/ }).waitFor({ timeout: 120000 });
  const ms = Date.now() - t0;
  const rows = await p.locator("ol > li").evaluateAll((lis) =>
    lis.map((li) => {
      const v = (sel: string) => (li.querySelector(sel) as HTMLInputElement | null)?.value ?? "";
      return [v('input[id^="name-"]'), v('input[id^="desc-"]'), v('input[id^="price-"]'), li.querySelector(".text-red-pen")?.textContent ?? ""];
    }),
  );
  const ignored = await p.locator("details li span").allTextContents();
  out[f] = { ms, rows, ignored };
  console.log(`\n=== ${f} (${(ms / 1000).toFixed(1)}s) ${rows.length} rows, ${ignored.length} ignored`);
  for (const r of rows) console.log("  ", JSON.stringify(r));
  await p.close();
}
writeFileSync(`${dir}/results.json`, JSON.stringify(out, null, 1));
await b.close();

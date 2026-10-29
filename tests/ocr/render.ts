/**
 * Render OCR fixtures to PNG with a real browser:  node tests/ocr/render.ts
 * Output: tests/ocr/images/<id>.png (committed, so evaluation is reproducible offline).
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { FIXTURES, type Fixture } from "./fixtures.ts";

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

function html(f: Fixture): string {
  const st = f.style ?? {};
  const ps = st.priceStyle ?? "inline";
  const item = (it: Fixture["sections"][number]["items"][number]) => {
    const price = it.price ? esc(it.price) : "";
    if (ps === "leaders") return `<div class="row"><span>${esc(it.name)} ........ ${price}</span></div>`;
    if (ps === "own-line")
      return `<div class="item"><div class="name">${esc(it.name)}</div>${it.description ? `<div class="desc">${esc(it.description)}</div>` : ""}<div class="price">${price}</div></div>`;
    return `<div class="item"><div class="row"><span class="name">${esc(it.name)}</span><span class="price">${price}</span></div>${it.description ? `<div class="desc">${esc(it.description)}</div>` : ""}</div>`;
  };
  const sections = f.sections.map((s) => `<section><h2>${esc(s.name)}</h2>${s.items.map(item).join("")}</section>`).join("");
  return `<!doctype html><html><head><style>
    body { margin: 0; background: #888; }
    .card { width: ${f.columns === 2 ? 1000 : 640}px; padding: 48px 56px; background: ${st.paper ?? "#fdfcf7"}; color: ${st.ink ?? "#1b1a17"};
      font-family: Georgia, "Times New Roman", serif; font-size: ${st.fontSize ?? 20}px; line-height: 1.35;
      filter: ${st.filter ?? "none"}; transform: rotate(${st.rotateDeg ?? 0}deg); transform-origin: center; margin: 30px; }
    h1 { text-align: center; font-size: 1.8em; margin: 0 0 24px; letter-spacing: 0.06em; }
    h2 { font-size: 1em; letter-spacing: 0.2em; margin: 22px 0 10px; }
    .cols { display: grid; grid-template-columns: ${f.columns === 2 ? "1fr 1fr" : "1fr"}; column-gap: 120px; }
    .item { margin: 0 0 12px; }
    .row { display: flex; justify-content: space-between; gap: 24px; margin: 0 0 6px; }
    .name { font-weight: bold; }
    .desc { font-style: italic; }
  </style></head><body><div class="card">${f.blank ? `<div style="height:600px;background:linear-gradient(135deg,#d8cfbf,#9fb3a8)"></div>` : `<h1>${esc(f.title)}</h1><div class="cols">${sections}</div>`}</div></body></html>`;
}

const out = fileURLToPath(new URL("./images/", import.meta.url));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const f of FIXTURES) {
  await page.setContent(html(f));
  await page.locator(".card").screenshot({ path: `${out}${f.id}.png` });
  console.log("rendered", f.id);
}
await browser.close();

import { describe, expect, it } from "vitest";
import { FIXTURES, truthItems, truthLines } from "../../../tests/ocr/fixtures";
import { attachRowPrices, linesFromTesseract, parseMenuText, type OcrLine } from "./parse";

const box = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 });
const word = (text: string, x0: number, x1: number, y = 100) => ({ text, confidence: 90, bbox: box(x0, y, x1, y + 20) });

describe("linesFromTesseract", () => {
  it("splits a line that Tesseract merged across two columns and keeps prices with their names", () => {
    const words = [word("Al", 0, 20), word("Pastor", 26, 90), word("$5.50", 400, 450), word("Chicken", 560, 640), word("Enchiladas", 646, 760), word("$16.00", 960, 1020)];
    const lines = linesFromTesseract([{ paragraphs: [{ lines: [{ text: words.map((w) => w.text).join("   "), confidence: 90, bbox: box(0, 100, 1020, 120), words }] }] }]);
    expect(lines.map((l) => l.text)).toEqual(["Al Pastor $5.50", "Chicken Enchiladas $16.00"]);
    expect(lines[1].bbox).toEqual(box(560, 100, 1020, 120));
  });

  it("leaves normal lines alone", () => {
    const words = [word("Pork", 0, 50), word("Gyoza", 56, 120), word("$9", 130, 150)];
    expect(linesFromTesseract([{ paragraphs: [{ lines: [{ text: "Pork Gyoza $9", confidence: 90, bbox: box(0, 100, 150, 120), words }] }] }]).map((l) => l.text)).toEqual(["Pork Gyoza $9"]);
  });
});

describe("attachRowPrices", () => {
  it("re-attaches a right-aligned price column to the dish on the same row", () => {
    const lines: OcrLine[] = [
      { text: "Tiramisu", bbox: box(0, 100, 120, 120) },
      { text: "Lemon Tart", bbox: box(0, 140, 140, 160) },
      { text: "$9", bbox: box(600, 101, 630, 121) },
      { text: "$8", bbox: box(600, 141, 630, 161) },
    ];
    expect(attachRowPrices(lines).map((l) => l.text)).toEqual(["Tiramisu $9", "Lemon Tart $8"]);
  });

  it("ignores lines without positions", () => {
    const lines: OcrLine[] = [{ text: "Tiramisu" }, { text: "$9" }];
    expect(attachRowPrices(lines)).toBe(lines);
  });
});

describe("parser on ground-truth fixture text (no OCR errors)", () => {
  for (const f of FIXTURES) {
    it(`${f.id}: finds every dish and price`, () => {
      const items = parseMenuText(truthLines(f).join("\n")).items;
      const truth = truthItems(f);
      expect(items.map((i) => i.name)).toEqual(truth.map((t) => t.name));
      expect(items.map((i) => i.priceCents)).toEqual(truth.map((t) => t.priceCents));
    });
  }
});

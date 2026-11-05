import { describe, expect, it } from "vitest";
import { FIXTURES, truthItems, truthLines } from "../../../tests/ocr/fixtures";
import { parseDictionary } from "./paddle";
import { attachRowPrices, linesFromBoxes, linesFromTesseract, parseMenuText, type OcrLine, type PaddleBoxLike } from "./parse";
import { computeScale, enhanceGray, flattenLighting, PROFILES } from "./preprocess";

const box = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 });
const word = (text: string, x0: number, x1: number, y = 100) => ({ text, confidence: 90, bbox: box(x0, y, x1, y + 20) });

describe("linesFromTesseract", () => {
  it("splits a line that Tesseract merged across two columns and keeps prices with their names", () => {
    const words = [word("Al", 0, 20), word("Pastor", 26, 90), word("$5.50", 400, 450), word("Chicken", 560, 640), word("Enchiladas", 646, 760), word("$16.00", 960, 1020)];
    const lines = linesFromTesseract([{ paragraphs: [{ lines: [{ text: words.map((w) => w.text).join("   "), confidence: 90, bbox: box(0, 100, 1020, 120), words }] }] }]);
    expect(lines.map((l) => l.text)).toEqual(["Al Pastor $5.50", "Chicken Enchiladas $16.00"]);
    expect(lines[1].bbox).toEqual(box(560, 100, 1020, 120));
  });

  it("separates a name from a smaller-set description on the same line", () => {
    const big = (t: string, x0: number, x1: number) => ({ text: t, confidence: 90, bbox: box(x0, 100, x1, 124) });
    const small = (t: string, x0: number, x1: number) => ({ text: t, confidence: 90, bbox: box(x0, 106, x1, 122) });
    const words = [big("*Chicken", 0, 90), big("Satay", 98, 160), small("Grilled", 172, 230), small("chicken", 236, 300), small("skewers", 306, 370), small("(n)", 376, 400)];
    const [line] = linesFromTesseract([{ paragraphs: [{ lines: [{ text: "", confidence: 90, bbox: box(0, 100, 400, 124), words }] }] }]);
    expect(line.text).toBe("*Chicken Satay — Grilled chicken skewers (n)");
    expect(parseMenuText([line]).items[0]).toMatchObject({ name: "Chicken Satay", description: "Grilled chicken skewers (n)" });
  });

  it("deskews tilted lines so columns stay separable", () => {
    const tilt = 0.03;
    const line = (t: string, x: number, y: number, w: number) => {
      const y0 = y + x * tilt;
      return { text: t, confidence: 90, bbox: box(x, y0, x + w, y0 + 20 + w * tilt), baseline: box(x, y0 + 18, x + w, y0 + 18 + w * tilt) };
    };
    const out = linesFromTesseract([{ paragraphs: [{ lines: [line("Left dish", 0, 100, 300), line("Right dish", 700, 100, 300), line("Other", 0, 140, 200)] }] }]);
    // After deskew, two lines on the same printed row have (nearly) the same y
    expect(Math.abs(out[0].bbox!.y0 - out[1].bbox!.y0)).toBeLessThan(4);
  });

  it("leaves normal lines alone", () => {
    const words = [word("Pork", 0, 50), word("Gyoza", 56, 120), word("$9", 130, 150)];
    expect(linesFromTesseract([{ paragraphs: [{ lines: [{ text: "Pork Gyoza $9", confidence: 90, bbox: box(0, 100, 150, 120), words }] }] }]).map((l) => l.text)).toEqual(["Pork Gyoza $9"]);
  });
});

describe("linesFromBoxes (PaddleOCR)", () => {
  const pb = (text: string, x: number, y: number, width: number, height = 20, confidence = 0.98): PaddleBoxLike => ({ text, confidence, box: { x, y, width, height } });

  it("joins a name and description the detector split, and keeps a nearby price on the row", () => {
    const lines = linesFromBoxes([pb("Chicken Satay", 0, 100, 140), pb("grilled skewers, peanut", 160, 102, 220, 18), pb("$12", 400, 100, 30)]);
    expect(lines.map((l) => l.text)).toEqual(["Chicken Satay — grilled skewers, peanut $12"]);
    expect(parseMenuText(lines).items[0]).toMatchObject({ name: "Chicken Satay", description: "grilled skewers, peanut", priceCents: 1200 });
    expect(lines[0].confidence).toBeCloseTo(98);
  });

  it("splits two columns at the gutter and lets a far-off price find its own row", () => {
    const lines = linesFromBoxes([pb("Al Pastor", 0, 100, 90), pb("$5.50", 400, 100, 50), pb("Chicken Enchiladas", 560, 100, 200), pb("$16.00", 960, 100, 60)]);
    expect(lines.map((l) => l.text)).toEqual(["Al Pastor", "$5.50", "Chicken Enchiladas", "$16.00"]);
    const items = parseMenuText(lines).items;
    expect(items.map((i) => [i.name, i.priceCents])).toEqual([["Al Pastor", 550], ["Chicken Enchiladas", 1600]]);
  });

  it("puts boxes on separate rows into separate lines, top to bottom", () => {
    expect(linesFromBoxes([pb("Lemon Tart", 0, 140, 120), pb("Tiramisu", 0, 100, 100)]).map((l) => l.text)).toEqual(["Tiramisu", "Lemon Tart"]);
  });

  it("deskews tilted boxes from their corner points", () => {
    const tilt = 0.04;
    const tb = (text: string, x: number, y: number, w: number): PaddleBoxLike => {
      const y0 = y + x * tilt;
      const pts = [{ x, y: y0 }, { x: x + w, y: y0 + w * tilt }, { x: x + w, y: y0 + w * tilt + 20 }, { x, y: y0 + 20 }] as NonNullable<PaddleBoxLike["box"]["points"]>;
      return { text, confidence: 0.9, box: { x, y: y0, width: w, height: 20 + w * tilt, points: pts } };
    };
    const out = linesFromBoxes([tb("Left dish", 0, 100, 300), tb("Right dish", 700, 100, 300), tb("Other", 0, 140, 200)]);
    const left = out.find((l) => l.text === "Left dish")!;
    const right = out.find((l) => l.text === "Right dish")!;
    expect(Math.abs(left.bbox!.y0 - right.bbox!.y0)).toBeLessThan(4);
  });

  it("drops empty boxes and returns nothing for an empty page", () => {
    expect(linesFromBoxes([])).toEqual([]);
    expect(linesFromBoxes([pb("  ", 0, 0, 10)])).toEqual([]);
  });
});

describe("parseDictionary", () => {
  it("keeps every entry (including a literal space line) and appends the space class", () => {
    expect(parseDictionary("a\nb\n \nc\n")).toEqual(["a", "b", " ", "c", " "]);
    expect(parseDictionary("a\r\nb")).toEqual(["a", "b", " "]);
  });
});

describe("preprocessing", () => {
  const img = (w: number, h: number, f: (x: number, y: number) => number) => {
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px.set([f(x, y), f(x, y), f(x, y), 255], (y * w + x) * 4);
    return px;
  };

  it("upscales small photos for Tesseract but not for PaddleOCR, and caps huge ones for both", () => {
    expect(computeScale(800, 600, PROFILES.tesseract)).toBe(2.5);
    expect(computeScale(800, 600, PROFILES.paddle)).toBe(1);
    expect(computeScale(4000, 3000, PROFILES.tesseract)).toBeCloseTo(0.65);
    expect(computeScale(4000, 3000, PROFILES.paddle)).toBeCloseTo(0.5);
  });

  it("flattens a shadow so text on the dark side is as distinct as on the bright side", () => {
    // Paper fades from 240 to 90 left→right; one-pixel text strokes are 60% of the local paper.
    const w = 400;
    const h = 100;
    const paper = (x: number) => 240 - (150 * x) / w;
    const ink = (x: number, y: number) => (x % 20 === 10 && y % 10 < 6 ? 0.6 : 1);
    const gray = Float32Array.from({ length: w * h }, (_, i) => paper(i % w) * ink(i % w, Math.floor(i / w)));
    flattenLighting(gray, w, h);
    const at = (x: number, y: number) => gray[y * w + x];
    // Paper evens out across the page…
    expect(Math.abs(at(5, 50) - at(395, 50))).toBeLessThan(25);
    // …and ink stays clearly darker than the paper on both sides.
    expect(at(390, 2)).toBeLessThan(at(395, 2) * 0.75);
    expect(at(10, 2)).toBeLessThan(at(5, 2) * 0.75);
  });

  it("inverts light-on-dark boards so text ends up dark on light", () => {
    const px = img(50, 50, (x) => (x % 10 === 0 ? 230 : 40));
    enhanceGray(px, 50, 50, true);
    expect(px[0]).toBeLessThan(60); // x=0 was light chalk
    expect(px[4]).toBeGreaterThan(200); // x=1 was dark board
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
    it(`${f.id}: finds every dish, price and description`, () => {
      const items = parseMenuText(truthLines(f).join("\n")).items;
      const truth = truthItems(f);
      expect(items.map((i) => i.name)).toEqual(truth.map((t) => t.name));
      expect(items.map((i) => i.priceCents)).toEqual(truth.map((t) => t.priceCents));
      expect(items.map((i) => i.description)).toEqual(truth.map((t) => t.description));
    });
  }
});

/**
 * OCR text → candidate menu items. Deliberately conservative: it only splits and labels text that
 * is actually there, flags what it is unsure about, and leaves the user to confirm. It never
 * invents dishes, prices or descriptions.
 */

export interface OcrLine {
  text: string;
  /** Tesseract confidence 0–100. */
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** Minimal shape of Tesseract's block → paragraph → line → word output. */
export interface TesseractBlockLike {
  paragraphs: {
    lines: { text: string; confidence: number; bbox: Box; baseline?: Box; words?: { text: string; confidence: number; bbox: Box }[] }[];
  }[];
}

const PRICE_WORD = /^[$€£₹¥]?\d{1,4}(?:[.,]\d{1,2})?$/;
/** Marks a wide gap between a dish name and its description on one line. */
export const NAME_DESC_SEP = " — ";

/**
 * Flatten Tesseract output into lines for the parser:
 * - Deskew line boxes by the page's median baseline angle, so a tilted photo keeps a vertical gutter.
 * - Split a line at gaps much wider than the text is tall (Tesseract merges side-by-side columns),
 *   and right after a price that is followed by more text ("£10.50   Pork belly…").
 * - A lone price produced by a split is re-attached to the text on its left.
 * - A medium gap inside a line becomes a name/description separator ("Satay    grilled skewers").
 */
export function linesFromTesseract(blocks: TesseractBlockLike[]): OcrLine[] {
  const all = blocks.flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
  const angles = all
    .map((l) => l.baseline)
    .filter((b): b is Box => !!b && b.x1 - b.x0 > 40)
    .map((b) => Math.atan2(b.y1 - b.y0, b.x1 - b.x0))
    .sort((a, b) => a - b);
  const theta = angles.length >= 3 ? angles[Math.floor(angles.length / 2)] : 0;
  const cos = Math.cos(-theta);
  const sin = Math.sin(-theta);
  const deskew = (b: Box): Box => {
    if (Math.abs(theta) < 0.003) return b;
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const x = cx * cos - cy * sin;
    const y = cx * sin + cy * cos;
    const hw = (b.x1 - b.x0) / 2;
    const hh = (b.y1 - b.y0) / 2;
    return { x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh };
  };

  const out: OcrLine[] = [];
  for (const l of all) {
    const words = (l.words ?? []).filter((w) => w.text.trim());
    if (words.length < 2) {
      out.push({ text: l.text.replace(/\s+/g, " ").trim(), confidence: l.confidence, bbox: deskew(l.bbox) });
      continue;
    }
    const h = Math.max(1, l.bbox.y1 - l.bbox.y0);
    const segs: (typeof words)[] = [[words[0]]];
    for (let i = 1; i < words.length; i++) {
      const gap = words[i].bbox.x0 - words[i - 1].bbox.x1;
      const afterPrice = PRICE_WORD.test(words[i - 1].text) && !PRICE_WORD.test(words[i].text) && /\p{L}/u.test(words[i].text);
      if (gap > h * 2.5 || (afterPrice && gap > h * 0.8)) segs.push([words[i]]);
      else segs.at(-1)!.push(words[i]);
    }
    const merged: (typeof words)[] = [];
    for (const seg of segs) {
      const text = seg.map((w) => w.text).join(" ");
      if (merged.length && PRICE_ONLY.test(text)) merged.at(-1)!.push(...seg);
      else merged.push(seg);
    }
    for (const seg of merged) {
      // Menus often set the description smaller than the name: find where letter height drops and
      // stays down. Height is measured from the word's top to the baseline so descenders (g, y, p)
      // don't count, and only words with tall letters are compared.
      const bl = l.baseline;
      const baseAt = (x: number) => (bl && bl.x1 !== bl.x0 ? bl.y0 + ((x - bl.x0) * (bl.y1 - bl.y0)) / (bl.x1 - bl.x0) : null);
      const hts = seg.map((w) => {
        const b = baseAt((w.bbox.x0 + w.bbox.x1) / 2);
        return b !== null ? b - w.bbox.y0 : w.bbox.y1 - w.bbox.y0;
      });
      // Bullet-prefixed words ("*Chicken") measure taller than the letters, so they don't set the reference.
      const tall = seg.map((w) => /[A-Z0-9bdfhklt]/.test(w.text) && !/^[*•·●▪■★]/.test(w.text));
      const sizeBreak = (i: number) => {
        if (i < 1 || i > 6 || seg.length - i < 2 || !tall[i]) return false;
        const before = hts.slice(0, i).filter((_, j) => tall[j]);
        const after = hts.slice(i).filter((_, j) => tall[i + j]).sort((a, b) => a - b);
        if (!before.length || after.length < 2) return false;
        const ref = [...before].sort((a, b) => a - b)[Math.floor(before.length / 2)];
        return hts[i] < ref * 0.9 && hts[i - 1] >= ref * 0.92 && after[Math.floor(after.length / 2)] < ref * 0.9 && /^[\p{L}(]/u.test(seg[i].text);
      };
      let text = seg[0].text;
      let sepUsed = false;
      for (let i = 1; i < seg.length; i++) {
        const gap = seg[i].bbox.x0 - seg[i - 1].bbox.x1;
        const sep = !sepUsed && !PRICE_WORD.test(seg[i].text) && (gap > h * 1.2 || sizeBreak(i));
        text += sep ? NAME_DESC_SEP : " ";
        if (sep) sepUsed = true;
        text += seg[i].text;
      }
      out.push({
        text,
        confidence: seg.reduce((a, w) => a + w.confidence, 0) / seg.length,
        bbox: deskew({ x0: seg[0].bbox.x0, y0: Math.min(...seg.map((w) => w.bbox.y0)), x1: seg.at(-1)!.bbox.x1, y1: Math.max(...seg.map((w) => w.bbox.y1)) }),
      });
    }
  }
  return out;
}

export type CandidateFlag = "low-confidence" | "no-price" | "multiple-prices" | "long-name" | "check-price";

export interface Candidate {
  name: string;
  description?: string;
  priceCents?: number;
  priceText?: string;
  section?: string;
  /** 0–1, from OCR confidence of the lines it came from. */
  confidence: number;
  flags: CandidateFlag[];
  sourceLines: number[];
}

export interface ParseResult {
  items: Candidate[];
  sections: string[];
  /** Lines we chose not to use (noise, boilerplate). Shown to the user so nothing is silently lost. */
  ignored: string[];
  columns: number;
}

const CUR = "[$€£₹¥]";
const NUM = "\\d{1,4}(?:[.,]\\d{1,2})?";
const PRICE_TOKEN = `${CUR}?\\s?${NUM}`;
const PRICE_TAIL = new RegExp(
  `(?:^|[\\s.·…_\\-–—|:]+)(${PRICE_TOKEN}(?:\\s*(?:\\/|\\||or)\\s*${PRICE_TOKEN})*)(?:\\s*\\([^()]{0,30}\\))?\\s*$`,
);
const MARKET_TAIL = /(?:^|[\s.·…_\-–—|:]+)(m\.?\s?p\.?|market price|seasonal price|ask your server)\s*$/i;
const PRICE_ONLY = new RegExp(`^\\s*${PRICE_TOKEN}(?:\\s*(?:\\/|\\|)\\s*${PRICE_TOKEN})*(?:\\s*\\([^()]{0,30}\\))?\\s*$`);
const LEADERS = /[\s.·…_]{3,}$/;

const BOILERPLATE = [
  /https?:|www\.|\.com\b|@/i,
  /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
  /gratuity|service charge|consuming raw|undercooked|please (inform|let)|allerg(y|ies|en) (info|notice)|tax(es)? (not )?included|prices? (are )?subject|follow us|open (daily|mon|tue)|reservations/i,
];

const SECTION_WORDS =
  /^(starters?|appeti[sz]ers?|small plates?|large plates?|sharing|to share|snacks?|soups?|salads?|mains?|entr[eé]es?|pasta|pizzas?|noodles?|rice|curries|grill|tandoor|tacos?|burgers?|sandwich(es)?|bowls?|sides?|extras|desserts?|sweets?|dolci|postres?|drinks?|beverages?|cocktails?|wines?|beers?|coffee|tea|specials?|brunch|breakfast|lunch|dinner|mezze|meze|antipasti|primi|secondi|contorni|dim sum|sushi|sashimi|rolls?|kids|vegetarian|vegan)\b/i;

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const words = (s: string) => s.split(/\s+/).filter(Boolean);

function parsePriceCents(token: string): number | undefined {
  const m = token.replace(/\s/g, "").match(/(\d{1,4})(?:[.,](\d{1,2}))?/);
  if (!m) return undefined;
  const whole = Number(m[1]);
  const frac = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  return whole * 100 + frac;
}

function isTitleLike(s: string): boolean {
  const w = words(s);
  if (w.length === 0 || w.length > 7 || s.length > 48) return false;
  if (/[,;]/.test(s)) return false;
  const caps = w.filter((x) => /^[\p{Lu}\d&'"(]/u.test(x) || /^(and|with|of|the|de|di|al|la|le|e|y|a|in|on)$/i.test(x));
  return caps.length / w.length >= 0.6;
}

function isSection(s: string): boolean {
  const w = words(s);
  if (w.length > 4 || s.length > 32) return false;
  const lettersOnly = s.replace(/[^\p{L}\s&]/gu, "").trim();
  if (!lettersOnly) return false;
  const allCaps = lettersOnly === lettersOnly.toUpperCase() && letters(lettersOnly) >= 3;
  return SECTION_WORDS.test(lettersOnly) || (allCaps && w.length <= 3);
}

/** "Name — description" where the name part reads like a dish title. */
function nameDescSplit(s: string): [string, string] | null {
  const m = s.match(/^(.{2,40}?)\s+[–—]\s+(.{3,})$/) ?? s.match(/^(.{2,40}?):\s+(.{8,})$/);
  return m && isTitleLike(m[1]) ? [m[1].trim(), m[2].trim()] : null;
}

const BULLET = /^[*•·●▪■★◆◇○\-–—]+\s*/;

function looksLikeDescription(s: string): boolean {
  return /^[\p{Ll}(]/u.test(s) || /,/.test(s) || words(s).length > 7;
}

/**
 * Right-aligned prices are often recognised as a separate block. Re-attach each price-only line to
 * the nearest text line on its left whose vertical centre is within one line-height.
 */
export function attachRowPrices(lines: OcrLine[]): OcrLine[] {
  if (!lines.every((l) => l.bbox)) return lines;
  const isPrice = (l: OcrLine) => PRICE_ONLY.test(l.text.trim()) || MARKET_TAIL.test(` ${l.text.trim()}`) && letters(l.text) <= 12;
  const texts = lines.map((l) => ({ ...l, bbox: { ...l.bbox! } }));
  const absorbed = new Set<number>();
  const cy = (l: OcrLine) => (l.bbox!.y0 + l.bbox!.y1) / 2;
  texts.forEach((p, pi) => {
    if (!isPrice(p)) return;
    const h = Math.max(1, p.bbox.y1 - p.bbox.y0);
    let best = -1;
    let bestScore = Infinity;
    texts.forEach((t, ti) => {
      if (ti === pi || absorbed.has(ti) || isPrice(t) || t.bbox.x1 > p.bbox.x0 + 2) return;
      const dy = Math.abs(cy(t) - cy(p));
      if (dy > h * 1.1) return;
      const score = dy * 4 + (p.bbox.x0 - t.bbox.x1) / 10;
      if (score < bestScore) [best, bestScore] = [ti, score];
    });
    if (best < 0) return;
    const t = texts[best];
    // Skip if the text line already ends with a price.
    if (PRICE_TAIL.test(t.text)) return;
    t.text = `${t.text} ${p.text.trim()}`;
    t.bbox = { x0: t.bbox.x0, y0: Math.min(t.bbox.y0, p.bbox.y0), x1: p.bbox.x1, y1: Math.max(t.bbox.y1, p.bbox.y1) };
    t.confidence = Math.min(t.confidence ?? 90, p.confidence ?? 90);
    absorbed.add(pi);
  });
  return texts.filter((_, i) => !absorbed.has(i));
}

/** Order lines for reading, splitting into columns when a clear vertical gutter exists. */
export function readingOrder(lines: OcrLine[]): { ordered: { line: OcrLine; index: number }[]; columns: number } {
  const indexed = lines.map((line, index) => ({ line, index }));
  const boxed = indexed.filter((l) => l.line.bbox);
  if (boxed.length < lines.length || boxed.length < 6) return { ordered: indexed, columns: 1 };

  const minX = Math.min(...boxed.map((l) => l.line.bbox!.x0));
  const maxX = Math.max(...boxed.map((l) => l.line.bbox!.x1));
  const width = maxX - minX;
  if (width <= 0) return { ordered: indexed, columns: 1 };

  // Coverage histogram; find empty vertical bands in the middle 15–85% of the page.
  // 200 bins: a gutter can be as narrow as ~1.5% of the page (3 bins).
  const bins = 200;
  const cover = new Array<number>(bins).fill(0);
  for (const { line } of boxed) {
    const a = Math.floor(((line.bbox!.x0 - minX) / width) * (bins - 1));
    const b = Math.floor(((line.bbox!.x1 - minX) / width) * (bins - 1));
    for (let i = a; i <= b; i++) cover[i]++;
  }
  // Allow a couple of spanning lines (titles) to cross the gutter.
  const tolerance = Math.max(1, Math.floor(boxed.length * 0.08));
  const gutters: number[] = [];
  let runStart = -1;
  const lo = Math.floor(bins * 0.15);
  const hi = Math.floor(bins * 0.85);
  for (let i = lo; i <= hi; i++) {
    const empty = cover[i] <= tolerance;
    if (empty && runStart < 0) runStart = i;
    if ((!empty || i === hi) && runStart >= 0) {
      const runEnd = empty ? i : i - 1;
      if (runEnd - runStart + 1 >= 3) gutters.push(minX + (((runStart + runEnd) / 2) / (bins - 1)) * width);
      runStart = -1;
    }
  }
  if (gutters.length === 0) return { ordered: indexed.sort((a, b) => a.line.bbox!.y0 - b.line.bbox!.y0), columns: 1 };

  const edges = [-Infinity, ...gutters, Infinity];
  const columnOf = (l: OcrLine) => {
    const cx = (l.bbox!.x0 + l.bbox!.x1) / 2;
    return edges.findIndex((e, i) => cx >= e && cx < edges[i + 1]);
  };
  const ordered = [...indexed].sort((a, b) => columnOf(a.line) - columnOf(b.line) || a.line.bbox!.y0 - b.line.bbox!.y0);
  return { ordered, columns: gutters.length + 1 };
}

export function parseMenuText(input: OcrLine[] | string): ParseResult {
  const raw: OcrLine[] = typeof input === "string" ? input.split(/\r?\n/).map((text) => ({ text })) : attachRowPrices(input);
  const { ordered, columns } = readingOrder(raw);

  const ignored: string[] = [];
  const cleaned: { text: string; conf: number; index: number }[] = [];
  for (const { line, index } of ordered) {
    const text = line.text.replace(/\s+/g, " ").trim().replace(BULLET, "").replace(/\s+—\s*$/, "");
    if (!text) continue;
    const conf = (line.confidence ?? 90) / 100;
    if (BOILERPLATE.some((re) => re.test(text))) {
      ignored.push(text);
      continue;
    }
    const isPrice = PRICE_ONLY.test(text);
    const body = text.replace(PRICE_TAIL, "").trim() || text;
    if (!isPrice && (letters(body) < 2 || letters(body) / body.length < 0.5)) {
      ignored.push(text);
      continue;
    }
    cleaned.push({ text, conf, index });
  }

  // Decide price style: if most priced lines use a currency symbol or decimals, bare integers at
  // line end ("Chicken 65") are not treated as prices.
  const tails = cleaned.map((l) => l.text.match(PRICE_TAIL)?.[1]).filter((x): x is string => !!x);
  const formal = tails.filter((t) => new RegExp(CUR).test(t) || /[.,]\d{1,2}\b/.test(t)).length;
  const requireFormal = tails.length >= 3 && formal / tails.length >= 0.7;
  const isFormal = (t: string) => new RegExp(CUR).test(t) || /[.,]\d{1,2}\b/.test(t);

  const items: Candidate[] = [];
  const sections: string[] = [];
  let section: string | undefined;
  let current: Candidate | null = null;
  let descLines = 0;

  const extractPrice = (text: string) => {
    const market = text.match(MARKET_TAIL);
    if (market) return { rest: text.slice(0, market.index).trim(), priceText: market[1], cents: undefined, multi: false };
    const m = text.match(PRICE_TAIL);
    if (!m) return null;
    const token = m[1];
    if (requireFormal && !isFormal(token)) return null;
    const rest = text.slice(0, m.index).replace(LEADERS, "").replace(/[\s\-–—|:.·…]+$/, "").trim();
    if (!rest && !PRICE_ONLY.test(text)) return null;
    const parts = token.split(/\s*(?:\/|\||or)\s*/);
    const cents = parsePriceCents(parts[0]);
    return { rest, priceText: token.trim(), cents, multi: parts.length > 1 };
  };

  const start = (name: string, conf: number, index: number): Candidate => {
    let n = name;
    let description: string | undefined;
    // "Name — description" / "Name: description" on one line
    const split = nameDescSplit(n) ?? (() => {
      const m = n.match(/^(.{2,40}?)\s+-\s+(.{8,})$/);
      return m && isTitleLike(m[1]) ? ([m[1].trim(), m[2].trim()] as [string, string]) : null;
    })();
    if (split) [n, description] = split;
    else if (words(n).length > 6) {
      // "Salt cod fritters, spicy sauce, aioli": the first clause names the dish.
      const comma = n.match(/^([^,]{3,40}),\s*(.{3,})$/);
      if (comma && words(comma[1]).length <= 6) [n, description] = [comma[1].trim(), comma[2].trim()];
    }
    const c: Candidate = { name: n, description, section, confidence: conf, flags: [], sourceLines: [index] };
    items.push(c);
    descLines = description ? 1 : 0;
    return c;
  };

  for (const { text, conf, index } of cleaned) {
    const price = extractPrice(text);

    // A price alone on its line belongs to the item above it.
    if (price && !price.rest) {
      if (current && current.priceCents === undefined && !current.priceText) {
        current.priceCents = price.cents;
        current.priceText = price.priceText;
        if (price.multi) current.flags.push("multiple-prices");
        current.sourceLines.push(index);
        current.confidence = Math.min(current.confidence, conf);
      } else ignored.push(text);
      continue;
    }

    if (!price && isSection(text)) {
      section = text.replace(/\s+/g, " ");
      sections.push(section);
      current = null;
      continue;
    }

    if (price) {
      // Description line carrying the price for an item named on the previous line.
      const awaitingPrice = current && current.priceCents === undefined && !current.priceText && descLines < 2;
      if (current && awaitingPrice && looksLikeDescription(price.rest) && !isTitleLike(price.rest) && !nameDescSplit(price.rest)) {
        current.description = current.description ? `${current.description} ${price.rest}` : price.rest;
        current.priceCents = price.cents;
        current.priceText = price.priceText;
        if (price.multi) current.flags.push("multiple-prices");
        current.sourceLines.push(index);
        current.confidence = Math.min(current.confidence, conf);
        descLines++;
        continue;
      }
      current = start(price.rest, conf, index);
      current.priceCents = price.cents;
      current.priceText = price.priceText;
      if (price.multi) current.flags.push("multiple-prices");
      continue;
    }

    // No price on this line.
    if (nameDescSplit(text)) {
      current = start(text, conf, index);
      continue;
    }
    if (current && descLines < 3 && looksLikeDescription(text) && !isTitleLike(text)) {
      current.description = current.description ? `${current.description} ${text}` : text;
      current.sourceLines.push(index);
      current.confidence = Math.min(current.confidence, conf);
      descLines++;
      continue;
    }
    if (isTitleLike(text)) {
      current = start(text, conf, index);
      continue;
    }
    if (current && descLines < 3) {
      current.description = current.description ? `${current.description} ${text}` : text;
      current.sourceLines.push(index);
      descLines++;
      continue;
    }
    ignored.push(text);
  }

  // OCR often drops the decimal point ("£350" for £3.50). When most prices on this menu have
  // decimals and a decimal-less price is far above the rest, restore the point and flag it.
  const decimalPrices = items.filter((c) => c.priceCents !== undefined && /[.,]\d{2}/.test(c.priceText ?? "")).map((c) => c.priceCents!).sort((a, b) => a - b);
  const priced = items.filter((c) => c.priceCents !== undefined).length;
  if (decimalPrices.length >= 4 && decimalPrices.length / Math.max(1, priced) >= 0.6) {
    const median = decimalPrices[Math.floor(decimalPrices.length / 2)];
    for (const c of items) {
      const t = (c.priceText ?? "").split(/\s*(?:\/|\||or)\s*/)[0];
      if (c.priceCents === undefined || /[.,]/.test(t) || !/\d{3,4}\s*$/.test(t)) continue;
      const fixed = Math.round(c.priceCents / 100);
      const pence = c.priceCents % 10000 % 100 === 0 ? Math.floor(c.priceCents / 100) % 100 : -1;
      const looksLikePence = [25, 45, 50, 75, 90, 95, 99].includes(pence);
      if (looksLikePence && c.priceCents > median * 5 && fixed >= decimalPrices[0] * 0.5 && fixed <= median * 4) {
        c.priceCents = fixed;
        c.flags.push("check-price");
      }
    }
  }

  for (const c of items) {
    // Separators that didn't become a name/description split read as plain spaces.
    c.name = c.name.split(NAME_DESC_SEP).join(" ").trim();
    if (c.description) c.description = c.description.split(NAME_DESC_SEP).join(" ").replace(/^—\s*/, "").trim();
    // Price text like "12" with no cents info stays as text when not parseable.
    if (c.priceCents === undefined && !c.priceText) c.flags.push("no-price");
    if (c.confidence < 0.7) c.flags.push("low-confidence");
    if (words(c.name).length > 8) c.flags.push("long-name");
    c.confidence = Math.round(c.confidence * 100) / 100;
  }

  return { items: items.filter((c) => letters(c.name) >= 2), sections, ignored, columns };
}

/** Parse a price typed by the user in the review form ("12", "$12.50", "9,50", "MP"). */
export function parsePriceInput(raw: string): { priceCents?: number; priceText?: string } {
  const t = raw.trim();
  if (!t) return {};
  if (MARKET_TAIL.test(` ${t}`)) return { priceText: t.slice(0, 40) };
  if (PRICE_ONLY.test(t)) return { priceCents: parsePriceCents(t.split(/\s*(?:\/|\|)\s*/)[0]), priceText: t };
  return { priceText: t.slice(0, 40) };
}

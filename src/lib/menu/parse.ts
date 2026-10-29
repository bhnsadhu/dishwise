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
  paragraphs: { lines: { text: string; confidence: number; bbox: Box; words?: { text: string; confidence: number; bbox: Box }[] }[] }[];
}

/**
 * Flatten Tesseract output into lines, splitting a line wherever words are separated by a gap much
 * wider than the text is tall. Tesseract often merges side-by-side columns into one long line;
 * splitting lets readingOrder() find the gutter. A price left alone by a split is re-attached to
 * the text on its left so "Name …… $12" stays one line.
 */
export function linesFromTesseract(blocks: TesseractBlockLike[]): OcrLine[] {
  const out: OcrLine[] = [];
  for (const b of blocks)
    for (const p of b.paragraphs)
      for (const l of p.lines) {
        const words = (l.words ?? []).filter((w) => w.text.trim());
        if (words.length < 2) {
          out.push({ text: l.text.replace(/\s+/g, " ").trim(), confidence: l.confidence, bbox: l.bbox });
          continue;
        }
        const h = Math.max(1, l.bbox.y1 - l.bbox.y0);
        const segs: (typeof words)[] = [[words[0]]];
        for (let i = 1; i < words.length; i++) {
          const gap = words[i].bbox.x0 - words[i - 1].bbox.x1;
          if (gap > h * 2.5) segs.push([words[i]]);
          else segs.at(-1)!.push(words[i]);
        }
        const merged: (typeof words)[] = [];
        for (const seg of segs) {
          const text = seg.map((w) => w.text).join(" ");
          if (merged.length && PRICE_ONLY.test(text)) merged.at(-1)!.push(...seg);
          else merged.push(seg);
        }
        for (const seg of merged) {
          out.push({
            text: seg.map((w) => w.text).join(" "),
            confidence: seg.reduce((a, w) => a + w.confidence, 0) / seg.length,
            bbox: { x0: seg[0].bbox.x0, y0: Math.min(...seg.map((w) => w.bbox.y0)), x1: seg.at(-1)!.bbox.x1, y1: Math.max(...seg.map((w) => w.bbox.y1)) },
          });
        }
      }
  return out;
}

export type CandidateFlag = "low-confidence" | "no-price" | "multiple-prices" | "long-name";

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
  `(?:^|[\\s.·…_\\-–—|:]+)(${PRICE_TOKEN}(?:\\s*(?:\\/|\\||or)\\s*${PRICE_TOKEN})*)\\s*$`,
);
const MARKET_TAIL = /(?:^|[\s.·…_\-–—|:]+)(m\.?\s?p\.?|market price|seasonal price|ask your server)\s*$/i;
const PRICE_ONLY = new RegExp(`^\\s*${PRICE_TOKEN}(?:\\s*(?:\\/|\\|)\\s*${PRICE_TOKEN})*\\s*$`);
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
  const bins = 100;
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
  for (let i = 15; i <= 85; i++) {
    const empty = cover[i] <= tolerance;
    if (empty && runStart < 0) runStart = i;
    if ((!empty || i === 85) && runStart >= 0) {
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
    const text = line.text.replace(/\s+/g, " ").trim();
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
    // "Name – description" or "Name: description" on one line
    const split = n.match(/^(.{2,40}?)\s+[–—-]\s+(.{8,})$/) ?? n.match(/^(.{2,40}?):\s+(.{8,})$/);
    if (split && isTitleLike(split[1])) {
      n = split[1].trim();
      description = split[2].trim();
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
      if (current && awaitingPrice && looksLikeDescription(price.rest) && !isTitleLike(price.rest)) {
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

  for (const c of items) {
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

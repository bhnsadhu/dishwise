/**
 * Ground-truth menus for OCR + parser evaluation. Written for Dishwise; restaurants are fictional.
 * Each fixture is rendered to a PNG by tests/ocr/render.ts with the styling described here.
 */

export interface TruthItem {
  name: string;
  description?: string;
  /** Price exactly as printed. */
  price?: string;
  priceCents?: number;
}

export interface Fixture {
  id: string;
  title: string;
  note: string;
  columns: 1 | 2;
  sections: { name: string; items: TruthItem[] }[];
  style?: {
    /** CSS filter applied to the whole card, e.g. blur for a soft photo. */
    filter?: string;
    rotateDeg?: number;
    ink?: string;
    paper?: string;
    fontSize?: number;
    /** "leaders": Name ........ 12 · "own-line": price on its own line · "inline" (default) */
    priceStyle?: "inline" | "leaders" | "own-line";
  };
  /** A blank image with no text at all (failed scan). */
  blank?: boolean;
}

export const FIXTURES: Fixture[] = [
  {
    id: "clean",
    title: "THE COPPER SPOON",
    note: "Clear printed single-column menu",
    columns: 1,
    sections: [
      {
        name: "STARTERS",
        items: [
          { name: "Charred Corn Soup", description: "smoked paprika, lime crema", price: "$9", priceCents: 900 },
          { name: "Crispy Brussels Sprouts", description: "chili honey, toasted sesame", price: "$11", priceCents: 1100 },
          { name: "Tuna Crudo", description: "citrus, radish, olive oil", price: "$15", priceCents: 1500 },
        ],
      },
      {
        name: "MAINS",
        items: [
          { name: "Roast Chicken", description: "garlic jus, potato puree", price: "$24", priceCents: 2400 },
          { name: "Mushroom Risotto", description: "porcini, parmesan, thyme", price: "$21", priceCents: 2100 },
          { name: "Grilled Salmon", description: "lemon butter, green beans", price: "$27", priceCents: 2700 },
          { name: "Short Rib Ragu", description: "pappardelle, red wine, pecorino", price: "$25", priceCents: 2500 },
        ],
      },
    ],
  },
  {
    id: "two-column",
    title: "THE TIN COMAL",
    note: "Two-column layout",
    columns: 2,
    sections: [
      {
        name: "TACOS",
        items: [
          { name: "Al Pastor", description: "pork, pineapple, onion", price: "$5.50", priceCents: 550 },
          { name: "Baja Fish", description: "battered cod, slaw, crema", price: "$6.00", priceCents: 600 },
          { name: "Rajas", description: "poblano, corn, queso", price: "$5.00", priceCents: 500 },
        ],
      },
      {
        name: "PLATES",
        items: [
          { name: "Chicken Enchiladas", description: "salsa verde, crema", price: "$16.00", priceCents: 1600 },
          { name: "Carnitas Bowl", description: "rice, black beans, pico", price: "$15.00", priceCents: 1500 },
          { name: "Steak Burrito", description: "carne asada, rice, cheese", price: "$14.50", priceCents: 1450 },
        ],
      },
    ],
  },
  {
    id: "odd-prices",
    title: "BISTRO LUNE",
    note: "Dot leaders, euro decimal commas, size ranges and market price",
    columns: 1,
    style: { priceStyle: "leaders" },
    sections: [
      {
        name: "ENTRÉES",
        items: [
          { name: "Soupe a l'Oignon", price: "€9,50", priceCents: 950 },
          { name: "Escargots", price: "€12,00", priceCents: 1200 },
          { name: "Moules Frites", price: "€18 / 26", priceCents: 1800 },
        ],
      },
      {
        name: "PLATS",
        items: [
          { name: "Steak au Poivre", price: "€29,00", priceCents: 2900 },
          { name: "Sole Meuniere", price: "MP" },
          { name: "Duck Confit", price: "€24,50", priceCents: 2450 },
        ],
      },
    ],
  },
  {
    id: "price-own-line",
    title: "HARBOR NOODLE HOUSE",
    note: "Name, description, and price each on their own line",
    columns: 1,
    style: { priceStyle: "own-line" },
    sections: [
      {
        name: "NOODLES",
        items: [
          { name: "Dan Dan Noodles", description: "pork, chili oil, peanuts", price: "$14", priceCents: 1400 },
          { name: "Beef Chow Fun", description: "wide rice noodles, scallion", price: "$16", priceCents: 1600 },
          { name: "Vegetable Lo Mein", description: "bok choy, mushroom, carrot", price: "$13", priceCents: 1300 },
        ],
      },
    ],
  },
  {
    id: "names-only",
    title: "SWEET THINGS",
    note: "Incomplete menu: names and prices, no descriptions",
    columns: 1,
    sections: [
      {
        name: "DESSERTS",
        items: [
          { name: "Tiramisu", price: "$9", priceCents: 900 },
          { name: "Lemon Tart", price: "$8", priceCents: 800 },
          { name: "Chocolate Mousse", price: "$9", priceCents: 900 },
          { name: "Affogato", price: "$7", priceCents: 700 },
        ],
      },
    ],
  },
  {
    id: "degraded",
    title: "THE COPPER SPOON",
    note: "Same as 'clean' but blurred, tilted 2°, low contrast and smaller, like a quick phone photo",
    columns: 1,
    style: { filter: "blur(1.1px)", rotateDeg: 2, ink: "#6a645a", paper: "#e9dfcc", fontSize: 15 },
    sections: [
      {
        name: "STARTERS",
        items: [
          { name: "Charred Corn Soup", description: "smoked paprika, lime crema", price: "$9", priceCents: 900 },
          { name: "Crispy Brussels Sprouts", description: "chili honey, toasted sesame", price: "$11", priceCents: 1100 },
          { name: "Tuna Crudo", description: "citrus, radish, olive oil", price: "$15", priceCents: 1500 },
        ],
      },
      {
        name: "MAINS",
        items: [
          { name: "Roast Chicken", description: "garlic jus, potato puree", price: "$24", priceCents: 2400 },
          { name: "Mushroom Risotto", description: "porcini, parmesan, thyme", price: "$21", priceCents: 2100 },
        ],
      },
    ],
  },
  { id: "blank", title: "", note: "No text at all (failed scan)", columns: 1, sections: [], blank: true },
];

/** The text lines a perfect OCR would return, in reading order. */
export function truthLines(f: Fixture): string[] {
  if (f.blank) return [];
  const lines: string[] = [f.title];
  for (const s of f.sections) {
    lines.push(s.name);
    for (const it of s.items) {
      const ps = f.style?.priceStyle ?? "inline";
      if (ps === "inline") lines.push(`${it.name} ${it.price ?? ""}`.trim());
      else if (ps === "leaders") lines.push(`${it.name} ........ ${it.price ?? ""}`.trim());
      else lines.push(it.name);
      if (it.description) lines.push(it.description);
      if (ps === "own-line" && it.price) lines.push(it.price);
    }
  }
  return lines;
}

export const truthItems = (f: Fixture) => f.sections.flatMap((s) => s.items);

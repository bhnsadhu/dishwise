import type { MetadataRoute } from "next";
import { SAMPLE_MENUS } from "@/lib/menu/samples";
import { RESTAURANTS } from "@/lib/restaurants/catalog";

const BASE = "https://dishwise.bhanusadhu.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/taste", "/menus", "/scan", "/how", ...SAMPLE_MENUS.map((m) => `/m/${m.id}`), ...RESTAURANTS.map(restaurant => `/restaurants/${restaurant.id}`)].map((p) => ({ url: `${BASE}${p}` }));
}

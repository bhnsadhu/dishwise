import type { MetadataRoute } from "next";
import { SAMPLE_MENUS } from "@/lib/menu/samples";

const BASE = "https://dishwise.bhanusadhu.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/taste", "/menus", "/scan", "/how", ...SAMPLE_MENUS.map((m) => `/m/${m.id}`)].map((p) => ({ url: `${BASE}${p}` }));
}

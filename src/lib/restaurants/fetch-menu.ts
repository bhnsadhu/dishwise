import "server-only";
import type { MenuInput } from "@/lib/domain/schemas";
import { restaurantById } from "./catalog";
import { parseWatsonsMenu } from "./parse-watsons";
import { parseKohinoorMenu } from "./parse-kohinoor";
import { parseKofusionMenu } from "./parse-kofusion";
import { parseFiestaMenu } from "./parse-fiesta";
import { parseJupitersMenu } from "./parse-jupiters";

const PARSERS: Record<string, (html: string) => MenuInput> = {
  "watsons-the-yard": parseWatsonsMenu,
  kohinoor: parseKohinoorMenu,
  "kofusion-downtown": parseKofusionMenu,
  "fiesta-cafe": parseFiestaMenu,
  "jupiters-downtown": parseJupitersMenu,
};

export type RestaurantMenuResult =
  | { status: "ready"; menu: MenuInput; checkedAt: string }
  | { status: "unavailable" }
  | { status: "not-found" };

// Squarespace can serve a larger page to the hosting region than to a local browser.
export const MAX_MENU_BYTES = 3_000_000;

async function boundedHtml(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`Menu HTTP ${response.status}`);
  if (!/^text\/html(?:;|$)/i.test(response.headers.get("content-type") ?? "")) throw new Error("Menu response is not HTML");
  if (Number(response.headers.get("content-length")) > MAX_MENU_BYTES || !response.body) throw new Error("Menu too large or empty");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let html = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_MENU_BYTES) {
        await reader.cancel();
        throw new Error("Menu too large");
      }
      html += decoder.decode(value, { stream: true });
    }
    return html + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

/** Only a reviewed registry ID can choose a source. User URLs and redirects are never fetched. */
export async function fetchRestaurantMenu(id: string, fetcher: typeof fetch = fetch): Promise<RestaurantMenuResult> {
  const restaurant = restaurantById(id);
  if (!restaurant) return { status: "not-found" };
  try {
    const response = await fetcher(restaurant.sourceUrl, {
      headers: { Accept: "text/html", "User-Agent": "Dishwise/0.1 (+https://github.com/bhnsadhu/dishwise)" },
      cache: "no-store",
      redirect: "error",
      credentials: "omit",
      signal: AbortSignal.timeout(8_000),
    });
    const menu = PARSERS[id](await boundedHtml(response));
    return { status: "ready", menu, checkedAt: new Date().toISOString() };
  } catch (error) {
    // Public source diagnostics only. Never log headers, cookies or response bodies.
    console.warn("Restaurant menu unavailable", id, error instanceof Error ? { name: error.name, message: error.message, cause: String(error.cause ?? "") } : "Unknown error");
    // A source error never falls back to invented dishes or a fictional sample.
    return { status: "unavailable" };
  }
}

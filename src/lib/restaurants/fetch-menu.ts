import "server-only";
import type { MenuInput } from "@/lib/domain/schemas";
import { restaurantById } from "./catalog";
import { parseWatsonsMenu } from "./parse-watsons";

export type RestaurantMenuResult =
  | { status: "ready"; menu: MenuInput; checkedAt: string }
  | { status: "unavailable" }
  | { status: "not-found" };

export const MAX_MENU_BYTES = 1_000_000;

async function boundedHtml(response: Response): Promise<string> {
  if (!response.ok || !/^text\/html(?:;|$)/i.test(response.headers.get("content-type") ?? "")) throw new Error("Menu unavailable");
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
    const menu = parseWatsonsMenu(await boundedHtml(response));
    return { status: "ready", menu, checkedAt: new Date().toISOString() };
  } catch {
    // A source error never falls back to invented dishes or a fictional sample.
    return { status: "unavailable" };
  }
}

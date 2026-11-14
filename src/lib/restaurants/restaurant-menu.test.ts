import { describe, expect, it, vi } from "vitest";
import { RESTAURANTS, searchRestaurants } from "./catalog";
import { fetchRestaurantMenu, MAX_MENU_BYTES } from "./fetch-menu";
import { parseWatsonsMenu } from "./parse-watsons";

// Authored fixtures reproduce the source's markup, not its menu copy or prices.
const sections = ["Snacks", "Salads &amp; Wraps", "Sandwiches", "Watson's Hot", "Tenders", "Sides"];
function fixture() {
  return `<div class="sqs-block-menu">${sections.map((section, i) => `<div class="menu-section">
    <div class="menu-section-title">${section}</div>
    ${i === 2 ? '<div class="menu-section-description">Served with fries</div>' : ""}
    <div class="menu-item">
      <div class="menu-item-title">Test dish ${i}</div>
      <div class="menu-item-description">Chicken &amp; pickles<script>ignore me</script></div>
      <span class="menu-item-price-top">${i === 1 ? "$10 small / $16 large" : "$12.50"}</span>
      <span class="menu-item-price-bottom">$12.50</span>
      <div class="menu-item-options">Add shrimp $4</div>
    </div>
    ${i === 2 ? '<div class="menu-item"><div class="menu-item-title">Additions</div><div class="menu-item-description">Shrimp $4 | Cheese $1</div></div>' : ""}
  </div>`).join("")}<div class="menu-section"><div class="menu-section-title">Sauces</div><div class="menu-item">Not a dish</div></div></div>`;
}
const htmlResponse = (body = fixture()) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

describe("restaurant menu extraction", () => {
  it("keeps factual prices, section context and size choices without treating add-ons as ingredients", () => {
    const menu = parseWatsonsMenu(fixture());
    expect(menu.items).toHaveLength(6);
    expect(menu.items[0]).toMatchObject({ priceCents: 1250, description: "Chicken & pickles" });
    expect(menu.items[1]).toMatchObject({ priceText: "$10 small / $16 large" });
    expect(menu.items[1]).not.toHaveProperty("priceCents");
    expect(menu.items[2].description).toBe("Chicken & pickles. Served with fries");
    expect(JSON.stringify(menu)).not.toMatch(/shrimp|ignore me|<script>/);
  });

  it("rejects partial, duplicate and changed sections instead of displaying incomplete rankings", () => {
    expect(() => parseWatsonsMenu("<html>Menu temporarily unavailable</html>")).toThrow();
    expect(() => parseWatsonsMenu(fixture().replace("Snacks", "Cocktails"))).toThrow();
    expect(() => parseWatsonsMenu(fixture() + fixture())).toThrow();
    expect(() => parseWatsonsMenu(fixture().replace("Test dish 0", ""))).toThrow();
  });

  it("does not invent a price when both source price positions are absent", () => {
    const html = fixture().replaceAll(/<(span) class="menu-item-price-(?:top|bottom)">.*?<\/span>/g, "");
    expect(parseWatsonsMenu(html).items.every(item => item.priceCents === undefined && item.priceText === undefined)).toBe(true);
  });
});

describe("bounded restaurant access", () => {
  it("fetches only the reviewed source and timestamps a successful parse", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(htmlResponse());
    const result = await fetchRestaurantMenu("watsons-the-yard", fetcher);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(RESTAURANTS[0].sourceUrl, expect.objectContaining({ redirect: "error", credentials: "omit", signal: expect.any(AbortSignal) }));
    expect(result).toMatchObject({ status: "ready", menu: { items: expect.any(Array) }, checkedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
  });

  it("rejects unknown IDs and user-supplied URLs before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const id of ["unknown", "https://example.com/", "http://127.0.0.1/", "__proto__"]) {
      expect(await fetchRestaurantMenu(id, fetcher)).toEqual({ status: "not-found" });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("recovers from source failure, changed markup, wrong content and oversized responses", async () => {
    const responses = [
      new Response("Unavailable", { status: 503 }),
      new Response("Redirect", { status: 302, headers: { location: "http://127.0.0.1/" } }),
      new Response("{}", { headers: { "content-type": "application/json" } }),
      htmlResponse("<html>Incomplete menu</html>"),
      new Response("x", { headers: { "content-type": "text/html", "content-length": String(MAX_MENU_BYTES + 1) } }),
      htmlResponse("x".repeat(MAX_MENU_BYTES + 1)),
    ];
    for (const response of responses) {
      expect(await fetchRestaurantMenu("watsons-the-yard", vi.fn<typeof fetch>().mockResolvedValue(response))).toEqual({ status: "unavailable" });
    }
    const timeout = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    expect(await fetchRestaurantMenu("watsons-the-yard", timeout)).toEqual({ status: "unavailable" });
    expect(timeout).toHaveBeenCalledOnce();
  });
});

it("searches location and restaurant names without claiming broader coverage", () => {
  for (const query of ["Watson's", "watson’s", "champaign chicken", "The Yard"]) expect(searchRestaurants(query)).toHaveLength(1);
  for (const query of ["", "URBANA", "champaign"]) expect(searchRestaurants(query)).toHaveLength(5);
  expect(searchRestaurants("Mexican").map(restaurant => restaurant.id)).toEqual(["fiesta-cafe"]);
  expect(searchRestaurants("Ko Fusion").map(restaurant => restaurant.id)).toEqual(["kofusion-downtown"]);
  expect(searchRestaurants("another restaurant")).toEqual([]);
});

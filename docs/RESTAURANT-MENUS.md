# Reviewed restaurant menus

The directory covers five reviewed Champaign-Urbana locations. It is an explicit list of supported sources, not a claim of citywide coverage or a business-hours service.

## Source and scope

Checked November 14, 2026. All sources are public HTML pages on the restaurants' official sites. Their published robots rules do not exclude these pages. No account, delivery-platform API, private endpoint, paid service or reverse-engineering capture is used. No source photos, branding or raw HTML are stored in the repository.

| Location and official source | Address | Included menu | Dishes | Fixed prices | Size prices | Missing prices |
| --- | --- | --- | --- | --- | --- | --- |
| [Watson's at The Yard](https://www.watsonschicken.com/the-yard) | 401 N Broadway Ave, Urbana | Six food sections | 19 | 17 | 2 | 0 |
| [Kohinoor](https://www.kohinoorchampaign.com/dinner-menu) | 6 E Columbia Ave, Champaign | Dinner food and the listed vegan lunch/dinner dishes | 138 | 137 | 1 | 0 |
| [KoFusion Downtown](https://www.kofusion.com/kitchen-menu/) | 30 E Main St, Champaign | Kitchen menu, excluding the separate sushi menu | 24 | 0 | 0 | 24 |
| [Fiesta Cafe](https://fiestacafe.com/lunch-menu-and-appetizers) | 216 S 1st St, Champaign | Weekday lunch specials, 11am to 5pm, and appetizers | 21 | 15 | 6 | 0 |
| [Jupiter's Downtown](https://www.jupiterspizza.com/menus/) | 39 E Main St, Champaign | Starters, sides, grinders, salads and specialty pizzas | 28 | 14 | 14 | 0 |

That is 230 listed dishes, not 230 currently available orders. A restaurant's page does not guarantee current availability, prices or allergy information. Watson's location is distinct from the closed Shack & Rail in Champaign; KoFusion's current site identifies its downtown location as 30 E Main St.

Kohinoor's section-wide prices apply only to dishes without an individual price. Included lentil soup, naan, raita and curry sauce stay in the ingredient description. Vegan preparation on request is shown as a choice, never promoted into a standard-dish vegan label. Drinks are excluded.

KoFusion publishes no prices on this page. Dishwise leaves them absent. Its separate italic protein lists are shown in dish details as choices, outside ingredient extraction and scoring. Fiesta's shared meat/side choices are handled the same way. Source descriptions that combine alternatives still describe the listed dish, not a customized order.

Jupiter's retains all three pizza-size prices without choosing a cheapest size for budget scoring. Grinder, salad and pizza names receive a factual category suffix where needed to distinguish feedback. Its duplicated side salad appears once. Build-your-own pizzas, standalone dressings/toppings, beverages and the unnamed pizza-of-the-month prompt are excluded. Optional add-ons and suggested toppings are shown separately. Watson's sauce list and sandwich additions are excluded.

## Data path

- Home's restaurant search matches names, cities and cuisine terms within the reviewed directory. An empty result offers scan and paste; it does not imply the restaurant does not exist. `/restaurants/[id]` loads the selected source on the server and passes plain menu fields to the existing ranking screen. Taste, ratings and saves keep their existing guest and account behavior.
- `src/lib/restaurants/catalog.ts` holds reviewed location metadata and local search terms. Only a registry ID can select a source URL.
- Each `parse-*.ts` adapter extracts plain text with Cheerio from one reviewed page structure. Expected food sections must all be present with dishes. Missing sections, unexpected food sections, duplicates and invalid records fail the load. `parse-helpers.ts` shares normalization and validation; source-specific exclusions remain explicit.
- `fetch-menu.ts` bounds the request to eight seconds and three megabytes. Squarespace serves a larger HTML response to the production hosting region than it does locally. Redirects, non-HTML responses and HTTP errors fail closed. No user-supplied URL is fetched and no cookies are sent. Server diagnostics record failure reasons without response bodies, headers or cookies.
- `get-menu.ts` uses Next's server cache. Successful results become eligible for refresh after one hour and expire after one day. A failed load is eligible for retry after one minute and expires after five minutes. The displayed check time is the successful retrieval time, not a restaurant-published update date. Cache timing is per server cache, not a global rate-limit guarantee.

Size-dependent prices do not participate in numeric budget scoring. `optionsText` survives enrichment for display but is never passed to ingredient extraction or scoring. The product identifies the menu subset and any missing-price limitation before the results. Source failures never substitute sample dishes or invented data.

## Verification

Run `npx vitest run src/lib/restaurants` for deterministic tests. Run `TEST_RESTAURANT_SOURCES=1 npx vitest run src/lib/restaurants/expanded-menus.test.ts` to fetch and validate all five actual sources. The tests cover extraction, add-on exclusion, variant and missing prices, incomplete markup, URL restrictions, response limits and source failure. Fixtures are authored examples of the HTML structure. The live check also verifies distinct feedback keys and reports fixed, variant and missing price counts. Routine tests do not contact the restaurants.

`tests/e2e/restaurants.spec.ts` covers search, empty results, keyboard navigation, source metadata, price ranges, personalization, saving and accessibility in both themes. The real-source journeys are opt-in because they depend on current restaurant menus. Expected live counts document this reviewed batch; inspect a changed source before updating them. With Dishwise running locally, run:

```sh
BASE_URL=http://127.0.0.1:3220 PLAYWRIGHT_CHANNEL=chrome TEST_LIVE_RESTAURANT=1 npx playwright test tests/e2e/restaurants.spec.ts --workers=1
```

`PLAYWRIGHT_CHANNEL=chrome` uses installed Chrome in a separate test profile. Omit it to use Playwright's Chromium. No personal browser session is used.

To add a location, verify its identity and public menu source, review applicable access restrictions, add a narrowly scoped adapter and registry entry, and test prices, options, missing data and changed markup. Never generalize this adapter into an arbitrary URL proxy or silently add all restaurants returned by a delivery platform.

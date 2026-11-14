# Restaurant menu pilot

The first supported location is [Watson's at The Yard](https://www.watsonschicken.com/the-yard), 401 N Broadway Ave, Urbana, Illinois. This is distinct from the closed Shack & Rail location in Champaign. The directory is an explicit list of supported sources, not a claim of citywide coverage or a business-hours service.

## Source and scope

Checked November 14, 2026. The restaurant's public HTML menu returned 19 food dishes in six sections: Snacks, Salads & Wraps, Sandwiches, Watson's Hot, Tenders and Sides. Seventeen dishes have a single numeric price; two have size-dependent prices, retained as text. The page's sandwich additions and sauce list are excluded from dish ranking. Optional extras are not added to a dish's ingredient description. Descriptions and shared section notes come from the menu; Dishwise's existing engine separately labels typical-recipe inferences.

The source's `robots.txt` permits the public page and disallows private API and JSON-format paths. The adapter reads only the public HTML page. It uses no account, delivery-platform API, private endpoint, paid service or reverse-engineering capture. No source photos, branding or raw HTML are stored in the repository. The restaurant's page is not a guarantee of current availability, prices or allergy information.

## Data path

- Home's restaurant search matches names, cities and cuisine terms within the reviewed directory. An empty result offers scan and paste; it does not imply the restaurant does not exist. `/restaurants/watsons-the-yard` loads the source on the server and passes plain menu fields to the existing ranking screen. Taste, ratings and saves keep their existing guest and account behavior.
- `src/lib/restaurants/catalog.ts` holds reviewed location metadata and local search terms. Only a registry ID can select a source URL.
- `parse-watsons.ts` extracts plain text with Cheerio. All six expected food sections must be present, each with dishes. Changed sections, duplicates and invalid records fail the load rather than silently presenting a partial menu.
- `fetch-menu.ts` bounds the request to eight seconds and three megabytes. Squarespace serves a larger HTML response to the production hosting region than it does locally. Redirects, non-HTML responses and HTTP errors fail closed. No user-supplied URL is fetched and no cookies are sent. Server diagnostics record failure reasons without response bodies, headers or cookies.
- `get-menu.ts` uses Next's server cache. Successful results become eligible for refresh after one hour and expire after one day. A failed load is eligible for retry after one minute and expires after five minutes. The displayed check time is the successful retrieval time, not a restaurant-published update date. Cache timing is per server cache, not a global rate-limit guarantee.

Size-dependent prices do not participate in numeric budget scoring. Sauce and protein choices within the main description remain combined, so rankings describe the listed dish rather than a customized order. Source failures never substitute sample dishes or invented data.

## Verification

Run `npx vitest run src/lib/restaurants/restaurant-menu.test.ts`. The tests cover extraction, add-on exclusion, variant and missing prices, incomplete markup, URL restrictions, response limits and source failure. Fixtures are authored examples of the HTML structure. A separate local smoke check fetched the actual public page and verified the 19-dish result and a size-dependent price; routine tests do not contact the restaurant.

`tests/e2e/restaurants.spec.ts` covers search, empty results, keyboard navigation, source metadata, price ranges, personalization, saving and accessibility in both themes. The real-source journey is opt-in because it depends on the restaurant's current menu. With Dishwise running locally, run:

```sh
BASE_URL=http://127.0.0.1:3220 PLAYWRIGHT_CHANNEL=chrome TEST_LIVE_RESTAURANT=1 npx playwright test tests/e2e/restaurants.spec.ts --workers=1
```

`PLAYWRIGHT_CHANNEL=chrome` uses installed Chrome in a separate test profile. Omit it to use Playwright's Chromium. No personal browser session is used.

To add a location, verify its identity and public menu source, review applicable access restrictions, add a narrowly scoped adapter and registry entry, and test prices, options, missing data and changed markup. Never generalize this adapter into an arbitrary URL proxy or silently add all restaurants returned by a delivery platform.

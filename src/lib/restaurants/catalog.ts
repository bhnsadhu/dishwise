import type { CuisineId } from "@/lib/domain/vocab";

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  address: string;
  cuisine: CuisineId;
  summary: string;
  sourceUrl: string;
  searchTerms: string[];
}

/** Reviewed locations only. A listing is not an endorsement or an opening-hours feed. */
export const RESTAURANTS: readonly Restaurant[] = [
  {
    id: "watsons-the-yard",
    name: "Watson’s at The Yard",
    city: "Urbana, IL",
    address: "401 N Broadway Ave, Urbana, IL 61801",
    cuisine: "american",
    summary: "Chicken sandwiches, tenders, tofu and sides",
    sourceUrl: "https://www.watsonschicken.com/the-yard",
    searchTerms: ["Watsons", "Watson's Chicken", "The Yard on Broadway", "Champaign", "Champaign Urbana", "Chambana", "American", "chicken", "tofu"],
  },
];

export const restaurantById = (id: string) => RESTAURANTS.find(restaurant => restaurant.id === id);

const searchable = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function searchRestaurants(query: string): readonly Restaurant[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  return RESTAURANTS.filter(restaurant => {
    const text = searchable([restaurant.name, restaurant.address, restaurant.summary, ...restaurant.searchTerms].join(" "));
    return words.every(word => text.includes(word));
  });
}

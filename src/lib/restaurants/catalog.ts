import type { CuisineId } from "@/lib/domain/vocab";

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  address: string;
  cuisine: CuisineId;
  summary: string;
  sourceUrl: string;
  menuNote?: string;
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
  {
    id: "kohinoor",
    name: "Kohinoor",
    city: "Champaign, IL",
    address: "6 E Columbia Ave, Champaign, IL 61820",
    cuisine: "indian",
    summary: "Indian dinner menu, curries, tandoori and breads",
    sourceUrl: "https://www.kohinoorchampaign.com/dinner-menu",
    menuNote: "Dinner food menu, including the listed vegan dishes. Drinks are not ranked. Vegan preparation on request is a choice, not a promise about the standard dish.",
    searchTerms: ["Koh-i-noor", "Indian", "curry", "tandoori", "Champaign Urbana", "Chambana"],
  },
  {
    id: "kofusion-downtown",
    name: "KoFusion Downtown",
    city: "Champaign, IL",
    address: "30 E Main St, Champaign, IL 61820",
    cuisine: "japanese",
    summary: "Asian kitchen menu, noodles, curries and starters",
    sourceUrl: "https://www.kofusion.com/kitchen-menu/",
    menuNote: "Kitchen menu only; sushi is on a separate menu. This source does not list prices. Protein choices are shown in dish details and are not included in the score.",
    searchTerms: ["Ko Fusion", "Japanese", "Korean", "Asian", "noodles", "Champaign Urbana", "Chambana"],
  },
  {
    id: "fiesta-cafe",
    name: "Fiesta Cafe",
    city: "Champaign, IL",
    address: "216 S 1st St, Champaign, IL 61820",
    cuisine: "mexican",
    summary: "Mexican weekday lunch specials and appetizers",
    sourceUrl: "https://fiestacafe.com/lunch-menu-and-appetizers",
    menuNote: "Lunch specials are listed for weekdays, 11am to 5pm. This menu also includes appetizers. Choose meat and sides with the restaurant; those choices are not included in the score.",
    searchTerms: ["Mexican", "tacos", "burrito", "lunch", "Champaign Urbana", "Chambana"],
  },
  {
    id: "jupiters-downtown",
    name: "Jupiter’s Downtown",
    city: "Champaign, IL",
    address: "39 E Main St, Champaign, IL 61820",
    cuisine: "italian",
    summary: "Specialty pizzas, grinders, salads and starters",
    sourceUrl: "https://www.jupiterspizza.com/menus/",
    menuNote: "Listed food dishes and specialty pizzas. Build-your-own pizzas, drinks and specials without a named dish are not ranked. Pizza sizes keep their separate prices.",
    searchTerms: ["Jupiter's", "Jupiters", "Pizzeria", "pizza", "Italian", "Champaign Urbana", "Chambana"],
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

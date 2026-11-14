"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./icons";
import { RESTAURANTS, searchRestaurants } from "@/lib/restaurants/catalog";

export function RestaurantSearch() {
  const [query, setQuery] = useState("");
  const restaurants = searchRestaurants(query);
  return (
    <section id="restaurants" aria-labelledby="restaurants-h" className="page mt-12 scroll-mt-24">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-end md:gap-10">
        <div>
          <h2 id="restaurants-h" className="text-[22px] font-bold tracking-[-0.015em]">Find a restaurant menu</h2>
          <p id="restaurant-coverage" className="mt-1 max-w-[60ch] text-[15px] text-sub">
            Starting in Champaign–Urbana with {RESTAURANTS.length} restaurant. Choose a menu and we’ll rank its dishes for your taste.
          </p>
        </div>
        <div>
          <label htmlFor="restaurant-search" className="label mb-1.5 block">Restaurant, city or cuisine</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sub"><Icon name="search" size={19} /></span>
            <input id="restaurant-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
              aria-describedby="restaurant-coverage" autoComplete="off" placeholder="Try Watson’s or Urbana" className="field pl-11" />
          </div>
        </div>
      </div>
      <p role="status" className="sr-only">{restaurants.length} supported restaurant{restaurants.length === 1 ? "" : "s"} found.</p>
      {restaurants.length > 0 ? (
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {restaurants.map(restaurant => (
            <li key={restaurant.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div className="min-w-0">
                <h3 className="text-[19px] font-semibold leading-snug">{restaurant.name}</h3>
                <p className="mt-1 text-[14px] text-sub">{restaurant.address}</p>
                <p className="mt-1 text-[14px] text-sub">{restaurant.summary}</p>
              </div>
              <Link href={`/restaurants/${restaurant.id}`} prefetch={false} className="btn btn-secondary" aria-label={`Rank the menu at ${restaurant.name}`}>
                Rank this menu <Icon name="forward" size={17} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 border-y border-line py-6">
          <h3 className="text-[17px] font-semibold">That restaurant isn’t in Dishwise yet</h3>
          <p className="mt-1 text-[15px] text-sub">You can still rank its dishes. Scan the menu or paste the text from its website.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/scan" className="btn btn-primary">Scan a menu</Link>
            <Link href="/scan?mode=type" className="btn btn-secondary">Paste a menu</Link>
            <button type="button" onClick={() => setQuery("")} className="btn btn-secondary">Clear search</button>
          </div>
        </div>
      )}
    </section>
  );
}

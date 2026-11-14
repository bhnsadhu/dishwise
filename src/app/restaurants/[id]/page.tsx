import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { restaurantById, RESTAURANTS } from "@/lib/restaurants/catalog";
import { getRestaurantMenu } from "@/lib/restaurants/get-menu";
import { ResultsPage } from "@/app/m/[id]/results-page";
import { RetryMenu } from "./retry-menu";

export function generateStaticParams() {
  return RESTAURANTS.map(restaurant => ({ id: restaurant.id }));
}

export async function generateMetadata({ params }: PageProps<"/restaurants/[id]">): Promise<Metadata> {
  const restaurant = restaurantById((await params).id);
  if (!restaurant) notFound();
  return { title: `${restaurant.name} menu`, description: `Find what to order at ${restaurant.name} in ${restaurant.city}, with dish rankings explained for your taste.` };
}

async function RestaurantMenu({ params }: Pick<PageProps<"/restaurants/[id]">, "params">) {
  const { id } = await params;
  const restaurant = restaurantById(id);
  if (!restaurant) notFound();
  const result = await getRestaurantMenu(id);
  if (result.status !== "ready") return (
    <div className="page py-8 md:py-12">
      <Link href="/#restaurants" className="link inline-flex min-h-11 items-center">Back to restaurant menus</Link>
      <h1 className="mt-5 text-[28px] font-bold leading-tight md:text-[38px]">{restaurant.name}</h1>
      <p className="mt-2 text-sub">{restaurant.address}</p>
      <div className="mt-6 max-w-2xl rounded-2xl border border-line p-5 md:p-6">
        <h2 className="text-[20px] font-semibold">We couldn’t load this menu</h2>
        <p className="mt-2 text-sub">The restaurant’s site may be unavailable or its menu may have changed. Try again in a minute, or scan or paste the menu to get your picks.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/scan" className="btn btn-primary">Scan a menu</Link>
          <Link href="/scan?mode=type" className="btn btn-secondary">Paste a menu</Link>
          <RetryMenu />
        </div>
        <a href={restaurant.sourceUrl} target="_blank" rel="noopener noreferrer" className="link mt-4 inline-flex min-h-11 items-center">Open restaurant’s menu<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </div>
  );
  return <ResultsPage providedMenu={{
    ...result.menu,
    id: `restaurant-${restaurant.id}`,
    illustrative: false,
    source: "restaurant",
    restaurant: { ...restaurant, checkedAt: result.checkedAt },
  }} />;
}

export default function Page({ params }: PageProps<"/restaurants/[id]">) {
  return <Suspense fallback={<div className="page pt-8" role="status"><p className="text-sub">Reading the restaurant’s menu…</p><div className="mt-5 h-32 rounded-2xl bg-surf" aria-hidden="true" /></div>}><RestaurantMenu params={params} /></Suspense>;
}

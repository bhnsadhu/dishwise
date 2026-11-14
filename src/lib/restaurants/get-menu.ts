import "server-only";
import { cacheLife } from "next/cache";
import { fetchRestaurantMenu } from "./fetch-menu";

export async function getRestaurantMenu(id: string) {
  "use cache";
  const result = await fetchRestaurantMenu(id);
  if (result.status === "ready") {
    cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  } else {
    cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  }
  return result;
}

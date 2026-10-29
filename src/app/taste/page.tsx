import type { Metadata } from "next";
import { TastePage } from "./taste-page";

export const metadata: Metadata = { title: "Your taste" };

export default function Page() {
  return <TastePage />;
}

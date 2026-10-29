import type { Metadata } from "next";
import { MenusPage } from "./menus-page";

export const metadata: Metadata = { title: "Menus" };

export default function Page() {
  return <MenusPage />;
}

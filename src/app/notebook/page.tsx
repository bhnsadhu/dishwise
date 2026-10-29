import type { Metadata } from "next";
import { NotebookPage } from "./notebook-page";

export const metadata: Metadata = { title: "Notebook" };

export default function Page() {
  return <NotebookPage />;
}

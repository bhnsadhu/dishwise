import { Suspense } from "react";
import { SAMPLE_MENUS } from "@/lib/menu/samples";
import { ResultsPage } from "./results-page";

/** Sample menus prerender; device-local menus (local-…) render on the client. */
export function generateStaticParams() {
  return SAMPLE_MENUS.map((m) => ({ id: m.id }));
}

export default function Page() {
  return (
    <Suspense fallback={<p className="wrap pt-8 font-hand text-[20px] text-table-ink">reading the menu…</p>}>
      <ResultsPage />
    </Suspense>
  );
}

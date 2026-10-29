import type { Metadata } from "next";
import { Suspense } from "react";
import { ScanPage } from "./scan-page";

export const metadata: Metadata = { title: "Scan a menu" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScanPage />
    </Suspense>
  );
}

import type { Metadata, Viewport } from "next";
import { Gloock, Gochi_Hand, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { Nav, NavBar } from "@/components/nav";
import "./globals.css";

const gloock = Gloock({ variable: "--font-gloock", weight: "400", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const gochi = Gochi_Hand({ variable: "--font-gochi", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Dishwise: what should I order?", template: "%s · Dishwise" },
  description: "Dishwise reads a restaurant menu and marks it up for your taste: the dishes you'll love circled, the reasons underlined, the conflicts crossed out.",
  applicationName: "Dishwise",
};

export const viewport: Viewport = {
  themeColor: "#203d36",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gloock.variable} ${newsreader.variable} ${gochi.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Suspense fallback={<NavBar />}>
          <Nav />
        </Suspense>
        <main id="main" className="flex-1 pb-16">
          {children}
        </main>
        <footer className="wrap pb-[max(24px,env(safe-area-inset-bottom))] pt-6 text-sm text-table-muted">
          <p>
            Sample restaurants are fictional. Dishwise reads menus; it can&apos;t see the kitchen. Always confirm allergies with the restaurant.
          </p>
          <p className="mt-1">
            Menu photos are read on your device and never uploaded.{" "}
            <a className="underline underline-offset-2 hover:text-table-ink" href="https://github.com/bhnsadhu/dishwise">
              Source on GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}

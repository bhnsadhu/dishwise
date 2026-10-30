import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { Suspense } from "react";
import { AppShell, ShellBars } from "@/components/app-shell";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://dishwise.bhanusadhu.com"),
  openGraph: { type: "website", siteName: "Dishwise" },
  twitter: { card: "summary_large_image" },
  title: { default: "Dishwise: what should I order?", template: "%s · Dishwise" },
  description: "Snap a restaurant menu and Dishwise ranks every dish for your taste, explains why, and flags what you avoid. Free, private, no sign-up.",
  applicationName: "Dishwise",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Suspense fallback={<ShellBars />}>
          <AppShell />
        </Suspense>
        <main id="main" className="pb-28 md:pb-16">
          {children}
        </main>
        <footer className="page hidden border-t border-line pb-10 pt-6 text-sm text-sub md:block">
          <p>
            Sample restaurants are fictional. Dishwise reads menus; it can&apos;t see the kitchen, so always confirm allergies with the restaurant. Menu photos are read on your
            device and never uploaded.{" "}
            <a className="link" href="https://github.com/bhnsadhu/dishwise">
              Source on GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}

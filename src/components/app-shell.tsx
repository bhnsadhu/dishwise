"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/client/store";
import { Icon, Mark, type IconName } from "./icons";

export const REPO_URL = "https://github.com/bhnsadhu/dishwise";

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" || p.startsWith("/m/") || p === "/menus" },
  { href: "/scan", label: "Scan", icon: "camera", match: (p) => p === "/scan" },
  { href: "/notebook", label: "Saved", icon: "heart", match: (p) => p === "/notebook" },
  { href: "/account", label: "You", icon: "user", match: (p) => p === "/account" || p === "/taste" || p === "/how" },
];

export function AppShell() {
  const path = usePathname();
  const { account } = useStore();
  return <ShellBars path={path} signedIn={account.status === "signed-in"} />;
}

/** Desktop top bar + phone bottom tab bar. Also used (pathless) as the Suspense fallback. */
export function ShellBars({ path = "", signedIn = false }: { path?: string; signedIn?: boolean }) {
  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-line bg-bar backdrop-blur-md md:block">
        <div className="page flex h-16 items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 text-[21px] font-extrabold tracking-[-0.03em]">
            <Mark />
            Dishwise
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {[...TABS, { href: "/taste", label: "Your taste", icon: "sliders" as IconName, match: (p: string) => p === "/taste" }].map((t) => {
              const on = t.href === "/" ? path === "/" || path.startsWith("/m/") || path === "/menus" : t.match(path) && !(t.href === "/account" && path === "/taste");
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold transition-colors ${on ? "bg-surf text-ink" : "text-sub hover:text-ink"}`}
                >
                  <Icon name={t.icon} size={19} />
                  {t.href === "/account" ? (signedIn ? "Account" : "Sign in") : t.label}
                </Link>
              );
            })}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 flex min-h-10 items-center gap-2 rounded-full border-2 border-brand px-3.5 text-[15px] font-semibold text-ink transition-colors hover:bg-brand-soft"
            >
              <Icon name="code" size={19} />
              Repository
              <span className="sr-only"> on GitHub (opens in a new tab)</span>
            </a>
          </nav>
        </div>
      </header>

      <nav
        aria-label="Tabs"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-bar pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden"
      >
        {TABS.map((t) => {
          const on = t.match(path);
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={`grid min-h-12 justify-items-center gap-0.5 text-[11px] font-semibold ${on ? "text-ink" : "text-sub"}`}>
              <span className={on ? "text-brand-text" : ""}>
                <Icon name={t.icon} size={24} />
              </span>
              {t.href === "/account" && !signedIn ? "You" : t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

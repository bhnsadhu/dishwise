"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/client/store";

const LINKS = [
  { href: "/taste", label: "Your taste" },
  { href: "/menus", label: "Menus" },
  { href: "/notebook", label: "Notebook" },
  { href: "/how", label: "How it works" },
];

export function Nav() {
  const path = usePathname();
  const { account } = useStore();
  return <NavBar path={path} accountStatus={account.status} />;
}

/** Static markup, also used as the Suspense fallback while the pathname is unknown. */
export function NavBar({ path = "", accountStatus = "loading" }: { path?: string; accountStatus?: string }) {
  return (
    <header className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-4 pt-[max(18px,env(safe-area-inset-top))]">
      <Link href="/" className="flex items-baseline gap-2 text-table-ink" aria-label="Dishwise home">
        <span className="font-display text-[28px] leading-none">Dishwise</span>
        <span className="hidden font-hand text-[17px] text-table-muted sm:inline">what should I order?</span>
      </Link>
      <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[16px]">
        {LINKS.map((l) => {
          const on = path === l.href || (l.href === "/menus" && (path.startsWith("/m/") || path === "/scan"));
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`min-h-10 content-center text-table-ink/85 underline-offset-[6px] hover:text-table-ink ${on ? "underline decoration-2" : ""}`}
            >
              {l.label}
            </Link>
          );
        })}
        {accountStatus !== "unavailable" && (
          <Link
            href="/account"
            aria-current={path === "/account" ? "page" : undefined}
            className={`min-h-10 content-center text-table-ink/85 underline-offset-[6px] hover:text-table-ink ${path === "/account" ? "underline decoration-2" : ""}`}
          >
            {accountStatus === "signed-in" ? "Account ✓" : "Sign in"}
          </Link>
        )}
      </nav>
    </header>
  );
}

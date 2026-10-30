"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./icons";

type Theme = "light" | "dark";
const KEY = "dw-theme";

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}`;

const root = () => document.documentElement;
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(root(), { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const read = (): Theme | null => (root().dataset.theme === "dark" ? "dark" : root().dataset.theme === "light" ? "light" : null);

function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => null);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    root().dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };
  return { theme, toggle, target: theme === "dark" ? "light" : "dark" } as const;
}

/** Top-bar item, styled like the nav links. */
export function ThemeToggle() {
  const { toggle, target } = useTheme();
  return (
    <button type="button" onClick={toggle} className="flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[15px] font-semibold text-sub transition-colors hover:text-ink">
      <Icon name={target === "dark" ? "moon" : "sun"} size={19} />
      {target === "dark" ? "Dark mode" : "Light mode"}
    </button>
  );
}

/** Phone header: icon only, with a spoken name. */
export function ThemeToggleIcon() {
  const { toggle, target } = useTheme();
  return (
    <button type="button" onClick={toggle} aria-label={`Switch to ${target} mode`} className="grid h-11 w-11 place-items-center rounded-full border border-ink/25 text-ink">
      <Icon name={target === "dark" ? "moon" : "sun"} size={19} />
    </button>
  );
}

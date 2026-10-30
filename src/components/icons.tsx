/** One stroke icon set (24px grid, 1.9 stroke, round caps). Decorative unless given a label. */

const PATHS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  camera: "M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7",
  heart: "M12 20s-7-4.4-9.2-8.6C1.4 8.6 3.2 5 6.6 5c2 0 3.4 1.2 5.4 3.3C14 6.2 15.4 5 17.4 5c3.4 0 5.2 3.6 3.8 6.4C19 15.6 12 20 12 20z",
  user: "M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M4 21c1.4-4 4.4-6 8-6s6.6 2 8 6",
  back: "M15 5l-7 7 7 7",
  forward: "M9 5l7 7-7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  paste: "M8 4h8v3H8z M6 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5",
  alert: "M12 4l9 16H3z M12 10v4M12 17v.5",
  info: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 11v5M12 8v.5",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8 M16 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4 M10 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  chili: "M15 4c1 1 1 2 0 3M14 7c-4 0-6 3-7 7s-3 5-4 6c4 1 9-1 11-5s1-8 0-8z",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  book: "M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z M5 16a4 4 0 0 1 4-4h10",
  logout: "M10 5H5v14h5 M14 8l4 4-4 4 M18 12H9",
  search: "M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14 M20 20l-3.5-3.5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, label, className = "" }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-none ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function StarIcon({ filled, size = 28 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="flex-none">
      <path
        d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"
        fill={filled ? "#f2a71b" : "none"}
        stroke={filled ? "#f2a71b" : "currentColor"}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** GitHub mark (Simple Icons, CC0). Only used to label the link to the project's repository. */
export function GithubMark({ size = 19, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={`flex-none ${className}`}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** Provisional mark: a bowl with a check. Owner to approve final branding. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <span className="grid flex-none place-items-center rounded-[9px] bg-brand text-brand-ink" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16a8 8 0 0 1-16 0z" />
        <path d="M9.5 9.5l2 2 4-4.5" />
      </svg>
    </span>
  );
}

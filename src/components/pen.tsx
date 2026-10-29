/** Ballpoint marks drawn over text. Decorative; meaning is always also conveyed in text. */

const CIRCLE = "M6,22 C-2,10 24,2 52,4 C82,6 104,12 100,24 C96,36 60,40 34,37 C14,35 2,30 6,20";
const STRIKE = "M-2,26 C30,20 70,22 104,16";

export function PenCircle({ red = false, animate = true }: { red?: boolean; animate?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={`pen-stroke ${animate ? "" : "drawn"} pointer-events-none absolute -inset-x-3.5 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+28px)] overflow-visible`}
    >
      <path d={CIRCLE} stroke={red ? "var(--color-red-pen)" : "var(--color-pen)"} />
    </svg>
  );
}

export function PenStrike({ animate = true }: { animate?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className={`pen-stroke ${animate ? "" : "drawn"} pointer-events-none absolute -inset-x-2 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+16px)] overflow-visible`}
    >
      <path d={STRIKE} stroke="var(--color-red-pen)" />
    </svg>
  );
}

export function ChiliIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M15 4c1 1 1 2 0 3M14 7c-4 0-6 3-7 7s-3 5-4 6c4 1 9-1 11-5s1-8 0-8z"
        fill={filled ? "var(--color-red-pen)" : "none"}
        stroke={filled ? "var(--color-red-pen)" : "var(--color-muted)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

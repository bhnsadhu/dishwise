"use client";

import { StarIcon } from "./icons";

/** 1–5 rating. Tapping the current rating clears it. */
export function Stars({ value, onChange, label = "Your rating", size = "md" }: { value: number | null; onChange: (v: number | null) => void; label?: string; size?: "sm" | "md" }) {
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex items-center text-line">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(value === n ? null : n)}
          className={`grid place-items-center rounded-full ${size === "sm" ? "h-9 w-8" : "h-11 w-10"} ${value !== null && n <= value ? "" : "text-sub/60 hover:text-sub"}`}
        >
          <StarIcon filled={value !== null && n <= value} size={size === "sm" ? 22 : 28} />
        </button>
      ))}
    </span>
  );
}

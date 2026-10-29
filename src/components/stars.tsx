"use client";

/** 1–5 rating in pen. Tapping the current rating clears it. */
export function Stars({ value, onChange, label = "Your rating", size = "md" }: { value: number | null; onChange: (v: number | null) => void; label?: string; size?: "sm" | "md" }) {
  return (
    <span role="radiogroup" aria-label={label} className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(value === n ? null : n)}
            className={`grid place-items-center ${size === "sm" ? "h-8 w-7 text-lg" : "h-10 w-9 text-2xl"} leading-none transition-colors ${on ? "text-pen" : "text-muted/40 hover:text-pen/60"}`}
          >
            ★
          </button>
        );
      })}
    </span>
  );
}

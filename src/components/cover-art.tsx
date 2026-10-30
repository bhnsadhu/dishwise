import type { CuisineId } from "@/lib/domain/vocab";

/** Flat food illustrations drawn for Dishwise, one per cuisine family. Decorative. */
const ART: Partial<Record<CuisineId | "default", React.ReactNode>> = {
  japanese: (
    <>
      <path d="M150 18l-44 52M163 24l-50 48" stroke="#5a3a22" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 60h120a60 46 0 0 1-120 0z" fill="#d9533a" />
      <path d="M40 60h120" stroke="#b8402b" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="100" cy="60" rx="58" ry="11" fill="#f3d8a1" />
      <path d="M60 58c8-6 14 6 22 0s14 6 22 0 14 6 22 0 14 6 18 0" fill="none" stroke="#e9b85c" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="118" cy="56" rx="13" ry="9" fill="#fff" />
      <circle cx="119" cy="56" r="5" fill="#f2a51a" />
      <path d="M70 52l14 4-12 6z" fill="#3d6b3a" />
      <path d="M84 30c-4-6 4-10 0-16M100 32c-4-6 4-10 0-16M116 30c-4-6 4-10 0-16" fill="none" stroke="#c9b9ad" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </>
  ),
  chinese: (
    <>
      <path d="M44 60h112a56 42 0 0 1-112 0z" fill="#e8e1d3" />
      <path d="M44 60h112" stroke="#c9bfa9" strokeWidth="6" strokeLinecap="round" />
      <path d="M70 58c6-14 22-18 30-6 8-12 24-8 30 6z" fill="#f4ead4" />
      <path d="M78 52c4 2 8 2 12 0M106 52c4 2 8 2 12 0" stroke="#d8c7a3" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 20l-40 40" stroke="#5a3a22" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  korean: (
    <>
      <path d="M40 60h120a60 46 0 0 1-120 0z" fill="#2d2d2d" />
      <ellipse cx="100" cy="60" rx="58" ry="11" fill="#f5efe2" />
      <path d="M62 58h18l-4-6h-12zM84 54h16v6H84zM104 54h16l2 6h-18zM124 56h14l-2 4h-12z" fill="#d9533a" />
      <ellipse cx="100" cy="56" rx="10" ry="6" fill="#fff" />
      <circle cx="100" cy="56" r="4" fill="#f2a51a" />
    </>
  ),
  thai: (
    <>
      <ellipse cx="100" cy="68" rx="64" ry="28" fill="#f2efe7" />
      <path d="M58 66c10-12 30-16 42-6 12-10 32-6 42 6-14 10-70 10-84 0z" fill="#e9b85c" />
      <path d="M70 62c8-4 16 4 24 0s16 4 24 0" fill="none" stroke="#d79b3a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="84" cy="58" r="4" fill="#d9533a" />
      <circle cx="116" cy="60" r="4" fill="#d9533a" />
      <path d="M126 50c6-6 14-4 14-4s-2 8-10 8z" fill="#3f8a46" />
    </>
  ),
  vietnamese: (
    <>
      <path d="M40 60h120a60 46 0 0 1-120 0z" fill="#3a6aa8" />
      <ellipse cx="100" cy="60" rx="58" ry="11" fill="#e7c98a" />
      <path d="M62 58c10-4 20 4 30 0s20 4 30 0 12 2 16 0" fill="none" stroke="#f5efe2" strokeWidth="4" strokeLinecap="round" />
      <path d="M118 52c6-6 14-4 14-4s-2 8-10 8z M80 52c6-6 14-4 14-4s-2 8-10 8z" fill="#3f8a46" />
    </>
  ),
  italian: (
    <>
      <path d="M56 22l96 18-72 70z" fill="#f2c25a" />
      <path d="M56 22l96 18" stroke="#c98a34" strokeWidth="12" strokeLinecap="round" />
      <path d="M66 36l78 15-60 52z" fill="#e2563b" />
      <path d="M70 40l70 13-54 46z" fill="#f7d37a" opacity=".55" />
      <circle cx="92" cy="58" r="8" fill="#b83a2a" />
      <circle cx="114" cy="56" r="7" fill="#b83a2a" />
      <circle cx="96" cy="80" r="7" fill="#b83a2a" />
      <path d="M106 70c6-8 16-6 16-6s-2 10-10 12c-4 1-6-2-6-6z" fill="#3f8a46" />
    </>
  ),
  indian: (
    <>
      <path d="M132 30c26 2 40 30 26 56-8 14-22 12-28 2-10-18-12-44 2-58z" fill="#e9c483" />
      <circle cx="142" cy="52" r="3" fill="#c89448" />
      <circle cx="150" cy="70" r="3" fill="#c89448" />
      <path d="M30 62h106a53 40 0 0 1-106 0z" fill="#3a6aa8" />
      <ellipse cx="83" cy="62" rx="51" ry="10" fill="#e07a2e" />
      <path d="M52 60c10-5 20 4 30-1s20 4 32-1" fill="none" stroke="#f4a35a" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 50c4-8 14-8 14-8s-2 10-10 10c-2 0-4-1-4-2z" fill="#3f8a46" />
      <circle cx="96" cy="58" r="4" fill="#fff4dd" />
    </>
  ),
  mexican: (
    <>
      <path d="M40 92a60 60 0 0 1 120 0z" fill="#f0bf4c" />
      <path d="M52 84c8-14 18-24 30-26 10 6 20 4 30-2 12 4 24 14 32 28" fill="#5aa04a" />
      <circle cx="76" cy="66" r="7" fill="#d94a38" />
      <circle cx="104" cy="60" r="6" fill="#d94a38" />
      <circle cx="128" cy="70" r="6" fill="#d94a38" />
      <path d="M84 74h8M110 72h10M66 80h8" stroke="#fff6dc" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 92a60 60 0 0 1 120 0" fill="none" stroke="#d99c2c" strokeWidth="6" />
    </>
  ),
  "middle-eastern": (
    <>
      <ellipse cx="96" cy="66" rx="64" ry="34" fill="#f5efe4" />
      <ellipse cx="96" cy="66" rx="64" ry="34" fill="none" stroke="#d8cbb4" strokeWidth="4" />
      <ellipse cx="90" cy="64" rx="38" ry="18" fill="#e8c98d" />
      <path d="M66 64c10-10 34-12 46 0-10 8-30 8-38 2" fill="none" stroke="#c79a52" strokeWidth="4" strokeLinecap="round" />
      <circle cx="92" cy="62" r="5" fill="#7a9a3a" />
      <circle cx="84" cy="66" r="2.5" fill="#d0483a" />
      <circle cx="100" cy="66" r="2.5" fill="#d0483a" />
      <path d="M140 40l30 10-24 20z" fill="#e2b26a" />
      <path d="M146 58l28 4-20 18z" fill="#d6a050" />
    </>
  ),
  default: (
    <>
      <ellipse cx="100" cy="66" rx="62" ry="30" fill="#f5efe4" />
      <ellipse cx="100" cy="66" rx="62" ry="30" fill="none" stroke="#d8cbb4" strokeWidth="4" />
      <ellipse cx="100" cy="64" rx="34" ry="14" fill="#e9b85c" />
      <path d="M86 60c6-4 22-4 28 0" stroke="#d79b3a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M40 30v34M34 30v12a6 6 0 0 0 12 0V30M160 30c-6 6-6 20 0 26v8" stroke="#a79b86" strokeWidth="4" strokeLinecap="round" fill="none" />
    </>
  ),
};

ART.french = ART.default;
ART.american = ART.default;
ART.mediterranean = ART["middle-eastern"];

const GROUND: Partial<Record<CuisineId, string>> = {
  japanese: "var(--cv-japanese)",
  chinese: "var(--cv-japanese)",
  korean: "var(--cv-japanese)",
  thai: "var(--cv-indian)",
  vietnamese: "var(--cv-mexican)",
  italian: "var(--cv-italian)",
  indian: "var(--cv-indian)",
  mexican: "var(--cv-mexican)",
  "middle-eastern": "var(--cv-middle-eastern)",
  mediterranean: "var(--cv-middle-eastern)",
};

export function coverGround(cuisine?: CuisineId) {
  return (cuisine && GROUND[cuisine]) ?? "var(--cv-default)";
}

export function CoverArt({ cuisine, className = "" }: { cuisine?: CuisineId; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
      {(cuisine && ART[cuisine]) ?? ART.default}
      <ellipse cx="100" cy="110" rx="48" ry="5" fill="#000" opacity=".08" />
    </svg>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

const SIGNALS: [string, string][] = [
  ["Something you avoid (diet or allergy)", "−60 if the menu says so, −35 if it's in the typical recipe. The dish is held back from your picks."],
  ["An ingredient you love", "+9 if stated, +5 if typical. Each extra match counts a little less, up to +22."],
  ["An ingredient you dislike", "−16 if stated, −9 if typical, down to −40."],
  ["A cuisine you love", "+10, or +4 for a close neighbour (say, Thai when you love Vietnamese)."],
  ["One of your favourite dishes", "+14 when the name matches, +12 for a take on it."],
  ["Flavours", "+6 for each flavour you enjoy, −9 for each one you'd rather avoid."],
  ["Heat", "−12 for each level above your tolerance (−8 if the heat is only typical)."],
  ["Budget", "Compared with this menu's own prices, from −7 to +6."],
  ["Your ratings", "Up to ±20 from what your past ratings say about ingredients, flavours and cuisines, plus up to ±16 when it closely resembles a dish you rated."],
  ["The menu itself", "Small nudges: “house” or “signature” +5, mains +3, sides −4, drinks −8."],
];

export default function HowPage() {
  return (
    <div className="page grid gap-10 pt-4 md:pt-10">
      <header className="grid max-w-[64ch] gap-2">
        <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.035em] text-balance md:text-[48px]">How Dishwise picks</h1>
        <p className="text-[17px] leading-relaxed text-sub">No AI chat and no black box. Every score is a sum of reasons you can see, and every reason points back to the menu&apos;s own words or a typical recipe.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="card grid gap-2 p-6" aria-labelledby="h1">
          <h2 id="h1" className="text-[21px] font-extrabold">
            Reading the menu
          </h2>
          <p className="leading-relaxed text-sub">
            Photos are read in your browser with{" "}
            <a className="link" href="https://github.com/naptha/tesseract.js">
              Tesseract.js
            </a>{" "}
            after a little clean-up: straightening, upscaling small photos, grayscale and contrast, and inverting chalkboards. A parser then finds dish names, prices, descriptions and sections. It handles dot leaders, “MP”, size ranges like “8 / 14”, two-column layouts, dietary codes like “(V)” and “(n)”, and text pasted from delivery apps. Lines it doesn&apos;t understand are shown to you, not thrown away, and you confirm everything before ranking.
          </p>
        </section>

        <section className="card grid gap-3 p-6" aria-labelledby="h2">
          <h2 id="h2" className="text-[21px] font-extrabold">
            Understanding each dish
          </h2>
          <p className="leading-relaxed text-sub">Ingredients, flavours, heat, course and cuisine are each tagged with where they came from:</p>
          <ul className="grid gap-2">
            <li className="flex gap-2.5">
              <span className="mt-0.5 rounded-md border border-line px-1.5 text-[12px] font-semibold text-sub">On menu</span>
              <span>The words are printed there (“chili oil” means heat).</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 rounded-md border border-dashed border-sub/50 px-1.5 text-[12px] font-semibold text-sub">Typical recipe</span>
              <span>A well-known dish usually has it (pad thai usually has peanuts), so it&apos;s labelled as a guess.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 rounded-md bg-surf px-1.5 text-[12px] font-semibold text-sub">Unknown</span>
              <span>If neither applies, Dishwise says nothing. It never invents ingredients.</span>
            </li>
          </ul>
          <p className="text-[14.5px] text-sub">It also catches “no onions”, “gluten-free” and “vegan cheese” (cheesy, not dairy).</p>
        </section>
      </div>

      <section className="card p-6" aria-labelledby="h3">
        <h2 id="h3" className="text-[21px] font-extrabold">
          Scoring
        </h2>
        <p className="mt-2 max-w-[72ch] leading-relaxed text-sub">
          Each signal adds or takes away points. The total folds into a 0–100% match: 0 points is 50%, +18 is about 73%, and +40 is about 90%. It&apos;s a ranking, not a promise you&apos;ll love the dish.
        </p>
        <dl className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
          {SIGNALS.map(([k, v]) => (
            <div key={k} className="border-t border-line pt-3">
              <dt className="font-bold">{k}</dt>
              <dd className="m-0 mt-0.5 text-[15px] text-sub">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-[15px] text-sub">Your top picks are then re-ordered for variety (maximal marginal relevance, applied less strongly while Dishwise knows nothing about you), so you don&apos;t get five near-identical ramens.</p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="card grid gap-2 p-6" aria-labelledby="h4">
          <h2 id="h4" className="text-[21px] font-extrabold">
            Learning from your ratings
          </h2>
          <p className="leading-relaxed text-sub">
            A rating turns into −1 to +1 (3★ is neutral) and is spread across the rated dish&apos;s ingredients, flavours and cuisine. It&apos;s damped so that one rating nudges and several consistent ratings convince. Saving a dish counts as a half-strength 4★. Ratings travel: love a miso ramen here and the next noodle bar knows.
          </p>
        </section>
        <section className="card grid gap-2 p-6" aria-labelledby="h5">
          <h2 id="h5" className="text-[21px] font-extrabold">
            Being careful
          </h2>
          <p className="leading-relaxed text-sub">
            Dishwise never calls a dish “safe” or “allergen-free”. Menus leave things out and kitchens change recipes. When you avoid something, every dish shows what the menu does and doesn&apos;t say, and asks you to check with the restaurant.
          </p>
        </section>
      </div>

      <p className="flex flex-wrap items-center gap-4">
        <Link href="/taste" className="btn btn-primary">
          Try it with your taste
        </Link>
        <a className="link" href="https://github.com/bhnsadhu/dishwise">
          Scoring code and tests on GitHub
        </a>
      </p>
    </div>
  );
}

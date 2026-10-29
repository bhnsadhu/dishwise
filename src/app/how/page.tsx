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
    <div className="wrap grid gap-8 pt-4">
      <header className="text-table-ink">
        <h1 className="font-display text-[clamp(40px,6vw,64px)] leading-none">How Dishwise reads a menu</h1>
        <p className="mt-3 max-w-[60ch] text-[18px] text-table-ink/85">No AI chat and no black box. Every score is a sum of reasons you can see, and every reason points back to the menu&apos;s own words or a typical recipe.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="paper paper-tilt-l" aria-labelledby="h1">
          <h2 id="h1" className="font-display text-[28px]">
            1 · Reading
          </h2>
          <p className="mt-2">
            Photos are read in your browser with <a className="link-pen" href="https://github.com/naptha/tesseract.js">Tesseract.js</a> after a little clean-up (rotation, grayscale, contrast). A parser then finds dish names, prices, descriptions and sections, and handles dot leaders, “MP”, size ranges like “8 / 14” and two-column layouts. Lines it doesn&apos;t understand are shown to you, not thrown away, and you confirm everything before ranking.
          </p>
        </section>

        <section className="paper paper-tilt-r" aria-labelledby="h2">
          <h2 id="h2" className="font-display text-[28px]">
            2 · Understanding
          </h2>
          <p className="mt-2">Each dish&apos;s ingredients, flavours, heat, course and cuisine are tagged with where they came from:</p>
          <ul className="mt-2 grid gap-1.5">
            <li>
              <span className="mk mk-pos">On the menu</span>: the words are printed there (“<em>chili oil</em>” → heat).
            </li>
            <li>
              <span className="mk-inf">Typical recipe</span>: a well-known dish usually has it (pad thai usually has peanuts), so it&apos;s marked as a guess.
            </li>
            <li>
              <strong>Unknown</strong>: if neither applies, Dishwise says nothing. It never invents ingredients.
            </li>
          </ul>
          <p className="mt-2 text-muted">It also catches “no onions”, “gluten-free” and “vegan cheese” (cheesy, not dairy).</p>
        </section>
      </div>

      <section className="paper" aria-labelledby="h3">
        <h2 id="h3" className="font-display text-[28px]">
          3 · Scoring
        </h2>
        <p className="mt-2 max-w-[70ch]">Each signal adds or takes away points. The total folds into a 0–100 match: 0 points is 50, +18 is about 73, +40 is about 90. It&apos;s a ranking, not a promise you&apos;ll love the dish.</p>
        <dl className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
          {SIGNALS.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd className="m-0 text-[15px] text-muted">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[15px] text-muted">Your top picks are then re-ordered for variety (maximal marginal relevance), so you don&apos;t get five near-identical ramens.</p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="paper paper-tilt-l" aria-labelledby="h4">
          <h2 id="h4" className="font-display text-[28px]">
            4 · Learning
          </h2>
          <p className="mt-2">
            A rating turns into −1 … +1 (3★ is neutral) and is spread across the rated dish&apos;s ingredients, flavours and cuisine. It&apos;s damped so that one rating nudges and several consistent ratings convince. Saving a dish counts as a half-strength 4★. Ratings travel: love a miso ramen here and the next noodle bar knows.
          </p>
        </section>
        <section className="paper paper-tilt-r" aria-labelledby="h5">
          <h2 id="h5" className="font-display text-[28px]">
            5 · Being careful
          </h2>
          <p className="mt-2">
            Dishwise never calls a dish “safe” or “allergen-free”. Menus leave things out and kitchens change recipes. When you avoid something, every dish shows what the menu does and doesn&apos;t say, and asks you to check with the restaurant.
          </p>
        </section>
      </div>

      <p className="text-table-ink/85">
        Built with Next.js, TypeScript, Neon Postgres and Tesseract.js, on free tiers. Scoring code and tests are{" "}
        <a className="underline underline-offset-4" href="https://github.com/bhnsadhu/dishwise">
          on GitHub
        </a>
        .{" "}
        <Link href="/taste" className="underline underline-offset-4">
          Try it with your taste →
        </Link>
      </p>
    </div>
  );
}

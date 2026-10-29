import Link from "next/link";
import { HeroMenu } from "@/components/hero-menu";

const STEPS = [
  { n: "1", title: "Mark your taste", body: "Circle what you love and cross out what you don't. Every question is optional, and it takes about a minute." },
  { n: "2", title: "Show it a menu", body: "Snap a photo (read on your device, never uploaded), type a few dishes, or try a sample menu." },
  { n: "3", title: "Read the marked-up menu", body: "Your picks are circled with the reasons underlined, and conflicts are crossed out. Rate what you order and the next menu gets smarter." },
];

export default function Home() {
  return (
    <div className="wrap grid gap-14">
      <section className="grid items-start gap-10 pt-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:pt-12">
        <div className="text-table-ink lg:sticky lg:top-10">
          <h1 className="font-display text-[clamp(48px,8vw,92px)] leading-[0.95] text-balance">What should I order?</h1>
          <p className="mt-5 max-w-[34ch] text-[20px] leading-snug text-table-ink/85">
            Dishwise reads the menu for you. It circles what you&apos;ll probably love, says why, and crosses out what doesn&apos;t fit.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/taste" className="tag-btn primary">
              Mark your taste →
            </Link>
            <Link href="/menus" className="tag-btn">
              Open a menu
            </Link>
          </div>
          <p className="mt-4 font-hand text-[18px] text-table-muted">no sign-up needed</p>
        </div>
        <HeroMenu />
      </section>

      <section aria-labelledby="how-h" className="grid gap-5">
        <h2 id="how-h" className="font-display text-[34px] text-table-ink">
          How it reads a menu
        </h2>
        <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className={`paper ${i === 1 ? "paper-tilt-r" : "paper-tilt-l"}`}>
              <p className="font-hand text-[30px] leading-none text-pen">{s.n}</p>
              <h3 className="mt-2 font-display text-[24px] leading-tight">{s.title}</h3>
              <p className="mt-2 text-[16px] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="text-table-ink/85">
          Every mark is backed by the menu&apos;s own words or a typical recipe, and Dishwise tells you which.{" "}
          <Link href="/how" className="underline underline-offset-4">
            See how the scoring works
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

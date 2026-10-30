"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useStore } from "@/lib/client/store";
import { menuInputSchema, type MenuItemInput } from "@/lib/domain/schemas";
import { CUISINES, type CuisineId } from "@/lib/domain/vocab";
import { ImageError, prepareImage, recognizeMenu, type OcrProgress } from "@/lib/menu/ocr";
import { parseMenuText, parsePriceInput, type Candidate } from "@/lib/menu/parse";

interface Row {
  id: number;
  name: string;
  description: string;
  price: string;
  section: string;
  flags: Candidate["flags"];
}

let nextId = 1;
const toRow = (c: Partial<Candidate>): Row => ({
  id: nextId++,
  name: c.name ?? "",
  description: c.description ?? "",
  price:
    c.priceCents !== undefined && (c.flags ?? []).includes("check-price")
      ? `${c.priceText?.match(/^[$€£₹¥]/)?.[0] ?? ""}${(c.priceCents / 100).toFixed(2)}`
      : (c.priceText ?? (c.priceCents !== undefined ? (c.priceCents / 100).toFixed(2) : "")),
  section: c.section ?? "",
  flags: c.flags ?? [],
});

const MAX_ITEMS = 250;
const TOO_MANY = `Dishwise reads up to ${MAX_ITEMS} dishes per menu, so the rest were left out. Split a very long menu into sections.`;

const FLAG_NOTES: Record<Candidate["flags"][number], string> = {
  "low-confidence": "hard to read, check the spelling",
  "no-price": "no price found",
  "multiple-prices": "several prices, using the first",
  "long-name": "long name, may include the description",
  "check-price": "price looked like it lost a decimal point, check it",
};

type Stage =
  | { kind: "pick" }
  | { kind: "type" }
  | { kind: "reading"; progress: OcrProgress; preview: string }
  | { kind: "review"; source: "scan" | "manual"; ignored: string[]; columns: number; ms?: number; confidence?: number; lowRes?: boolean };

export function ScanPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { addMenu } = useStore();
  const [stage, setStage] = useState<Stage>(params.get("mode") === "type" ? { kind: "type" } : { kind: "pick" });
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState("");
  const [cuisine, setCuisine] = useState<CuisineId | "">("");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    let preview = "";
    try {
      const prepared = await prepareImage(file);
      preview = prepared.canvas.toDataURL("image/jpeg", 0.6);
      setStage({ kind: "reading", progress: { status: "Starting", progress: 0 }, preview });
      const result = await recognizeMenu(prepared.canvas, (progress) => setStage({ kind: "reading", progress, preview }));
      const parsed = parseMenuText(result.lines);
      if (parsed.items.length === 0) {
        setError(
          result.text.trim().length < 10
            ? "Couldn't find any text in that photo. Try again closer, with the menu flat and well lit, or type the dishes instead."
            : "Found text, but couldn't tell which lines are dishes. You can add them yourself below.",
        );
        setRows([toRow({})]);
      } else {
        setRows(parsed.items.slice(0, MAX_ITEMS).map(toRow));
        if (parsed.items.length > MAX_ITEMS) setError(TOO_MANY);
        else if (parsed.items.length <= 2 && parsed.ignored.length >= 4) {
          setError("Only a couple of dishes were readable. For a better read, get closer so the menu fills the photo, or add the rest below.");
        }
      }
      setTitle((t) => t || "Scanned menu");
      setStage({ kind: "review", source: "scan", ignored: parsed.ignored, columns: parsed.columns, ms: result.ms, confidence: result.confidence, lowRes: prepared.lowResolution });
    } catch (e) {
      setError(e instanceof ImageError ? e.message : "Reading the photo failed. Check your connection (the text reader downloads once) and try again, or type the dishes.");
      setStage({ kind: "pick" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function parsePasted() {
    const parsed = parseMenuText(pasted);
    // When pasted text has no recognisable structure, treat each line as a dish name.
    const items = parsed.items.length
      ? parsed.items
      : pasted.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 250).map((name) => ({ name, flags: [] as Candidate["flags"] }));
    setRows((items.length ? items.slice(0, MAX_ITEMS) : [{}]).map(toRow));
    setError(items.length > MAX_ITEMS ? TOO_MANY : null);
    setTitle((t) => t || "My menu");
    setStage({ kind: "review", source: "manual", ignored: parsed.items.length ? parsed.ignored : [], columns: 1 });
  }

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, flags: patch.name !== undefined || patch.price !== undefined ? r.flags.filter((f) => f === "multiple-prices" || (patch.price === undefined && f === "check-price")) : r.flags } : r)));

  function submit() {
    setError(null);
    const items: MenuItemInput[] = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), description: r.description.trim() || undefined, section: r.section.trim() || undefined, ...parsePriceInput(r.price) }));
    const parsed = menuInputSchema.safeParse({ title: title.trim() || "My menu", cuisine: cuisine || undefined, items });
    if (!parsed.success) {
      setError(items.length === 0 ? "Add at least one dish name." : "Some dishes are too long. Shorten the highlighted fields and try again.");
      return;
    }
    const id = addMenu({ title: parsed.data.title, cuisine: parsed.data.cuisine, items: parsed.data.items, source: stage.kind === "review" ? stage.source : "manual" });
    router.push(`/m/${id}`);
  }

  return (
    <div className="page grid gap-6 pt-4 md:pt-8">
      <Link href="/" className="link hidden items-center gap-1 md:inline-flex">
        <Icon name="back" size={18} />
        Home
      </Link>

      {(stage.kind === "pick" || stage.kind === "type") && (
        <section className="mx-auto grid w-full max-w-2xl gap-6" aria-labelledby="scan-h">
          <header className="grid gap-1">
            <h1 id="scan-h" className="text-[30px] font-black tracking-[-0.03em] md:text-[40px]">
              Add a menu
            </h1>
            <p className="text-[16px] text-sub">Take a photo, or paste the text from a website or delivery app.</p>
          </header>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-surf p-1.5" role="tablist" aria-label="How to add a menu">
            {(["pick", "type"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={stage.kind === k}
                onClick={() => setStage({ kind: k })}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold transition-colors ${stage.kind === k ? "bg-card text-ink shadow-[var(--shadow)]" : "text-sub hover:text-ink"}`}
              >
                <Icon name={k === "pick" ? "camera" : "paste"} size={19} />
                {k === "pick" ? "Photo" : "Type or paste"}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="flex gap-2 rounded-2xl bg-no-soft p-4 text-[15px] text-no">
              <Icon name="alert" size={19} className="mt-0.5" />
              {error}
            </p>
          )}

          {stage.kind === "pick" ? (
            <div className="grid gap-4">
              <div className="card grid justify-items-center gap-4 border-dashed p-8 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand-text">
                  <Icon name="camera" size={30} />
                </span>
                <div>
                  <p className="text-[18px] font-bold">Photograph the menu</p>
                  <p className="mx-auto mt-1 max-w-[42ch] text-[14.5px] text-sub">Lay it flat, fill the frame, avoid glare. English menus work best. The photo is read in your browser and never uploaded.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button type="button" className="btn btn-primary md:hidden" onClick={() => cameraRef.current?.click()}>
                    <Icon name="camera" size={19} />
                    Take a photo
                  </button>
                  <button type="button" className="btn btn-primary hidden md:inline-flex" onClick={() => fileRef.current?.click()}>
                    Choose a photo
                  </button>
                  <button type="button" className="btn btn-secondary md:hidden" onClick={() => fileRef.current?.click()}>
                    Choose a photo
                  </button>
                </div>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a photo of a menu" onChange={(e) => handleFile(e.target.files?.[0])} />
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" className="sr-only" aria-label="Choose a menu photo" data-testid="menu-file" onChange={(e) => handleFile(e.target.files?.[0])} />
              <p className="text-[13.5px] text-sub">The first scan downloads the text reader (about 4 MB) and it&apos;s cached after that. Reading takes a few seconds.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              <label htmlFor="paste" className="text-[15px] text-sub">
                Paste a menu from a website or delivery app, or write one dish per line. Prices and descriptions are optional.
              </label>
              <textarea
                id="paste"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={9}
                maxLength={20000}
                placeholder={"Spicy Miso Ramen  $17\nmiso broth, ground pork, chili oil\nGyoza  $9"}
                className="field font-mono text-[14.5px]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-primary" onClick={parsePasted} disabled={!pasted.trim()}>
                  Read these dishes
                  <Icon name="forward" size={18} />
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setRows([toRow({}), toRow({}), toRow({})]);
                    setTitle("My menu");
                    setStage({ kind: "review", source: "manual", ignored: [], columns: 1 });
                  }}
                >
                  or fill in a form
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {stage.kind === "reading" && (
        <section className="card mx-auto grid w-full max-w-2xl gap-5 p-6" aria-live="polite" aria-busy="true">
          <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">Reading your menu…</h1>
          <div className="grid gap-2">
            <p className="font-semibold text-brand-text">{stage.progress.status}</p>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surf" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stage.progress.progress * 100)}>
              <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${Math.round(stage.progress.progress * 100)}%` }} />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stage.preview} alt="The photo being read, in grayscale" className="max-h-80 w-auto justify-self-center rounded-xl border border-line object-contain" />
        </section>
      )}

      {stage.kind === "review" && (
        <section className="mx-auto grid w-full max-w-3xl gap-6" aria-labelledby="review-h">
          <header className="grid gap-1">
            <h1 id="review-h" className="text-[30px] font-black tracking-[-0.03em] md:text-[38px]">
              {stage.source === "scan" ? "Check what we read" : "Check your dishes"}
            </h1>
            <p className="text-[15.5px] text-sub">
              {stage.source === "scan"
                ? `Found ${rows.filter((r) => r.name).length} dish${rows.length === 1 ? "" : "es"}${stage.columns > 1 ? ` across ${stage.columns} columns` : ""}${stage.ms ? ` in ${(stage.ms / 1000).toFixed(1)}s` : ""}. Fix anything misread. Dishwise only uses what's here.`
                : "Edit anything before ranking."}
            </p>
            {stage.lowRes && <p className="text-[14.5px] font-semibold text-warn">That photo is small, so a closer shot will read better.</p>}
          </header>
          {error && (
            <p role="alert" className="flex gap-2 rounded-2xl bg-warn-soft p-4 text-[15px] text-warn">
              <Icon name="alert" size={19} className="mt-0.5" />
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="grid gap-1.5">
              <span className="label">Restaurant</span>
              <input className="field text-[17px] font-bold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Cuisine (optional)</span>
              <select className="field" value={cuisine} onChange={(e) => setCuisine(e.target.value as CuisineId | "")}>
                <option value="">Not sure</option>
                {CUISINES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ol className="grid gap-3">
            {rows.map((r, i) => (
              <li key={r.id} className="card grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_130px]">
                <div className="grid min-w-0 gap-2">
                  <label className="sr-only" htmlFor={`name-${r.id}`}>
                    Dish {i + 1} name
                  </label>
                  <input id={`name-${r.id}`} className="field font-bold" value={r.name} maxLength={120} placeholder="Dish name" onChange={(e) => update(r.id, { name: e.target.value })} />
                  <label className="sr-only" htmlFor={`desc-${r.id}`}>
                    Dish {i + 1} description
                  </label>
                  <input id={`desc-${r.id}`} className="field text-[15px]" value={r.description} maxLength={600} placeholder="Description (optional)" onChange={(e) => update(r.id, { description: e.target.value })} />
                </div>
                <div className="grid content-start gap-2">
                  <label className="sr-only" htmlFor={`price-${r.id}`}>
                    Dish {i + 1} price
                  </label>
                  <input id={`price-${r.id}`} className="field tabular-nums" value={r.price} maxLength={40} placeholder="Price" inputMode="decimal" onChange={(e) => update(r.id, { price: e.target.value })} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} aria-label={`Remove dish ${i + 1}`}>
                    <Icon name="trash" size={16} />
                    Remove
                  </button>
                </div>
                {(r.section || r.flags.length > 0) && (
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {r.section && <span className="rounded-md bg-surf px-2 py-0.5 text-[12.5px] font-semibold text-sub">Under “{r.section}”</span>}
                    {r.flags.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-2 py-0.5 text-[12.5px] font-semibold text-warn">
                        <Icon name="alert" size={13} />
                        {FLAG_NOTES[f]}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="sticky bottom-[84px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-bar p-3 backdrop-blur-md md:bottom-4">
            <button type="button" className="btn btn-secondary btn-sm" disabled={rows.length >= MAX_ITEMS} onClick={() => setRows((rs) => [...rs, toRow({})])}>
              <Icon name="plus" size={17} />
              Add a dish
            </button>
            <button type="button" className="btn btn-primary" onClick={submit}>
              Rank these dishes
              <Icon name="forward" size={18} />
            </button>
          </div>

          {stage.ignored.length > 0 && (
            <details className="card p-4 text-[15px]">
              <summary className="cursor-pointer font-semibold text-sub">
                {stage.ignored.length} line{stage.ignored.length === 1 ? "" : "s"} we skipped (headers, notes, noise)
              </summary>
              <ul className="mt-3 grid gap-2">
                {stage.ignored.map((line, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 break-words text-sub">{line}</span>
                    <button type="button" className="link shrink-0 text-[14px]" onClick={() => setRows((rs) => [...rs, toRow({ name: line })])}>
                      add as dish
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}

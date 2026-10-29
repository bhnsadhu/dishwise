"use client";

import Link from "next/link";
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
  price: c.priceText ?? (c.priceCents !== undefined ? (c.priceCents / 100).toFixed(2) : ""),
  section: c.section ?? "",
  flags: c.flags ?? [],
});

const FLAG_NOTES: Record<Candidate["flags"][number], string> = {
  "low-confidence": "hard to read, check the spelling",
  "no-price": "no price found",
  "multiple-prices": "several prices, using the first",
  "long-name": "long name, may include the description",
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
        setRows(parsed.items.map(toRow));
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
    setRows((items.length ? items : [{}]).map(toRow));
    setTitle((t) => t || "My menu");
    setStage({ kind: "review", source: "manual", ignored: parsed.items.length ? parsed.ignored : [], columns: 1 });
  }

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, flags: patch.name !== undefined || patch.price !== undefined ? r.flags.filter((f) => f === "multiple-prices") : r.flags } : r)));

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
    <div className="wrap grid gap-6 pt-2">
      <Link href="/menus" className="text-table-ink underline-offset-4 hover:underline">
        ← Menus
      </Link>

      {(stage.kind === "pick" || stage.kind === "type") && (
        <section className="paper mx-auto w-full max-w-2xl" aria-labelledby="scan-h">
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-rule pb-3" role="tablist" aria-label="How to add a menu">
            {(["pick", "type"] as const).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={stage.kind === k} onClick={() => setStage({ kind: k })} className={`relative font-display text-[24px] ${stage.kind === k ? "text-ink" : "text-muted"}`}>
                {k === "pick" ? "Photo" : "Type or paste"}
                {stage.kind === k && <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-pen" />}
              </button>
            ))}
          </div>
          <h1 id="scan-h" className="sr-only">
            Add a menu
          </h1>

          {error && (
            <p role="alert" className="mt-4 font-hand text-[19px] text-red-pen">
              {error}
            </p>
          )}

          {stage.kind === "pick" ? (
            <div className="mt-5 grid gap-4">
              <p className="text-muted">Lay the menu flat, fill the frame, avoid glare. English menus work best. The photo is read in your browser and never uploaded.</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="tag-btn primary sm:hidden" onClick={() => cameraRef.current?.click()}>
                  Take a photo
                </button>
                <button type="button" className="tag-btn" onClick={() => fileRef.current?.click()}>
                  Choose a photo
                </button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a photo of a menu" onChange={(e) => handleFile(e.target.files?.[0])} />
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" className="sr-only" aria-label="Choose a menu photo" data-testid="menu-file" onChange={(e) => handleFile(e.target.files?.[0])} />
              <p className="text-sm text-muted">The first scan downloads the text reader (about 4 MB) and it&apos;s cached after that. Reading takes a few seconds.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              <label htmlFor="paste" className="text-muted">
                Paste a menu from a website, or write one dish per line. Prices and descriptions are optional.
              </label>
              <textarea
                id="paste"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={9}
                maxLength={20000}
                placeholder={"Spicy Miso Ramen  $17\nmiso broth, ground pork, chili oil\nGyoza  $9"}
                className="w-full rounded-sm border border-rule bg-paper-2 p-3 font-serif text-[16px] leading-relaxed"
              />
              <div className="flex flex-wrap gap-3">
                <button type="button" className="tag-btn primary" onClick={parsePasted} disabled={!pasted.trim()}>
                  Read these dishes →
                </button>
                <button type="button" className="link-pen" onClick={() => { setRows([toRow({}), toRow({}), toRow({})]); setTitle("My menu"); setStage({ kind: "review", source: "manual", ignored: [], columns: 1 }); }}>
                  or fill in a form
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {stage.kind === "reading" && (
        <section className="paper mx-auto grid w-full max-w-2xl gap-4" aria-live="polite" aria-busy="true">
          <h1 className="font-display text-[30px]">Reading your menu…</h1>
          <div className="grid gap-2">
            <p className="font-hand text-[20px] text-pen">{stage.progress.status}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-rule" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stage.progress.progress * 100)}>
              <div className="h-full bg-pen transition-[width]" style={{ width: `${Math.round(stage.progress.progress * 100)}%` }} />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stage.preview} alt="The photo being read, in grayscale" className="max-h-80 w-auto justify-self-center rounded-sm border border-rule object-contain" />
        </section>
      )}

      {stage.kind === "review" && (
        <section className="paper mx-auto grid w-full max-w-3xl gap-5" aria-labelledby="review-h">
          <div>
            <h1 id="review-h" className="font-display text-[32px] leading-tight">
              {stage.source === "scan" ? "Check what we read" : "Check your dishes"}
            </h1>
            <p className="mt-1 text-muted">
              {stage.source === "scan"
                ? `Found ${rows.filter((r) => r.name).length} dish${rows.length === 1 ? "" : "es"}${stage.columns > 1 ? ` across ${stage.columns} columns` : ""}${stage.ms ? ` in ${(stage.ms / 1000).toFixed(1)}s` : ""}. Fix anything misread. Dishwise only uses what's here.`
                : "Edit anything before ranking."}
            </p>
            {stage.lowRes && <p className="mt-1 font-hand text-[18px] text-red-pen">that photo is small, so a closer shot will read better</p>}
            {error && (
              <p role="alert" className="mt-2 font-hand text-[19px] text-red-pen">
                {error}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <label className="grid gap-1">
              <span className="label">Restaurant</span>
              <input className="field font-display text-[22px]" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </label>
            <label className="grid gap-1">
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

          <ol className="m-0 grid list-none gap-4 p-0">
            {rows.map((r, i) => (
              <li key={r.id} className="grid gap-x-3 gap-y-1 border-b border-rule pb-4 sm:grid-cols-[28px_minmax(0,1fr)_110px_auto]">
                <span className="hidden pt-2 font-hand text-[18px] text-muted sm:block">{i + 1}</span>
                <div className="grid min-w-0 gap-1">
                  <label className="sr-only" htmlFor={`name-${r.id}`}>
                    Dish {i + 1} name
                  </label>
                  <input id={`name-${r.id}`} className="field font-semibold" value={r.name} maxLength={120} placeholder="Dish name" onChange={(e) => update(r.id, { name: e.target.value })} />
                  <label className="sr-only" htmlFor={`desc-${r.id}`}>
                    Dish {i + 1} description
                  </label>
                  <input id={`desc-${r.id}`} className="field text-[15px] italic text-muted" value={r.description} maxLength={600} placeholder="Description (optional)" onChange={(e) => update(r.id, { description: e.target.value })} />
                  {r.section && <span className="text-xs uppercase tracking-[0.12em] text-muted">under “{r.section}”</span>}
                  {r.flags.length > 0 && <span className="font-hand text-[17px] text-red-pen">{r.flags.map((f) => FLAG_NOTES[f]).join(" · ")}</span>}
                </div>
                <div>
                  <label className="sr-only" htmlFor={`price-${r.id}`}>
                    Dish {i + 1} price
                  </label>
                  <input id={`price-${r.id}`} className="field tabular-nums" value={r.price} maxLength={40} placeholder="Price" inputMode="decimal" onChange={(e) => update(r.id, { price: e.target.value })} />
                </div>
                <button type="button" className="link-pen justify-self-start pt-2 text-sm text-muted sm:justify-self-end" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} aria-label={`Remove dish ${i + 1}`}>
                  remove
                </button>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="link-pen" onClick={() => setRows((rs) => [...rs, toRow({})])}>
              + add a dish
            </button>
            <button type="button" className="tag-btn primary" onClick={submit}>
              Mark up this menu →
            </button>
          </div>

          {stage.ignored.length > 0 && (
            <details className="text-[15px]">
              <summary className="cursor-pointer text-muted">{stage.ignored.length} line{stage.ignored.length === 1 ? "" : "s"} we skipped (headers, notes, noise)</summary>
              <ul className="m-0 mt-2 grid list-none gap-1 p-0">
                {stage.ignored.map((line, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 break-words text-muted">{line}</span>
                    <button type="button" className="link-pen shrink-0 text-sm" onClick={() => setRows((rs) => [...rs, toRow({ name: line })])}>
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

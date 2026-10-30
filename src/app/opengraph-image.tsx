import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MarkSvg } from "@/components/icons";
import { heldReason, level } from "@/components/match";
import { demoRecommendation } from "@/lib/reco/demo";
import { commonReasons, topReasons } from "@/lib/reco/reasons";

export const alt = "Dishwise: what should I order?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const semibold = await readFile(join(process.cwd(), "assets/fonts/figtree-600.ttf"));
const extrabold = await readFile(join(process.cwd(), "assets/fonts/figtree-800.ttf"));

// Light-theme tokens from globals.css (ImageResponse can't read CSS variables).
const C = { ink: "#1c1913", sub: "#6a6355", line: "#ece5d6", surf: "#f7f2e8", brand: "#f2a71b", brandInk: "#1c1303", ok: "#157a55", okSoft: "#e2f3eb", no: "#c2352b", noSoft: "#fbe9e7", cover: "#fde4d6" };

/** The real demo card: the sample menu ranked by the engine for the labelled example taste. */
export default function OpengraphImage() {
  const { menu, rec } = demoRecommendation();
  const common = commonReasons(rec);
  const held = rec.heldBack[0];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 56, padding: "0 64px", background: "#ffffff", color: C.ink, fontFamily: "Figtree" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, fontWeight: 800, letterSpacing: -1.2 }}>
            <MarkSvg size={56} brand={C.brand} ink={C.brandInk} />
            Dishwise
          </div>
          <div style={{ display: "flex", marginTop: 40, fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: -3.4 }}>What should I order?</div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 30, fontWeight: 600, lineHeight: 1.3, color: C.sub }}>Snap the menu. Every dish ranked for your taste, with the reasons.</div>
        </div>
        <div style={{ width: 470, display: "flex", flexDirection: "column", borderRadius: 28, border: `2px solid ${C.line}`, overflow: "hidden", boxShadow: "0 30px 60px -30px rgba(40,28,6,0.45)" }}>
          <div style={{ display: "flex", flexDirection: "column", padding: "22px 28px", background: C.cover }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>{menu.title}</div>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: C.sub }}>Example taste · sample menu</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "8px 28px 22px" }}>
            {rec.picks.slice(0, 3).map((p, i) => {
              const high = level(p) === "high";
              return (
                <div key={p.dish.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `2px solid ${C.line}` }}>
                  <div style={{ display: "flex", width: 18, fontSize: 18, fontWeight: 800, color: C.sub }}>{i + 1}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 22, fontWeight: 800 }}>{p.dish.name}</div>
                    <div style={{ display: "flex", fontSize: 16, fontWeight: 600, color: C.ok }}>{topReasons(p, 2, common).map((r) => r.text).join(" · ") || "A solid choice here"}</div>
                  </div>
                  <div style={{ display: "flex", padding: "5px 12px", borderRadius: 999, fontSize: 17, fontWeight: 800, background: high ? C.okSoft : C.surf, color: high ? C.ok : C.ink }}>{`${p.score}% match`}</div>
                </div>
              );
            })}
            {held && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, padding: "10px 14px", borderRadius: 14, background: C.noSoft, color: C.no, fontSize: 17, fontWeight: 600 }}>
                <span>{held.dish.name}</span>
                <span>{heldReason(held)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Figtree", data: semibold, style: "normal", weight: 600 },
        { name: "Figtree", data: extrabold, style: "normal", weight: 800 },
      ],
    },
  );
}

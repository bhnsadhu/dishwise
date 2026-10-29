import { ImageResponse } from "next/og";

export const alt = "Dishwise: what should I order?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#203d36", padding: 60 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", background: "#fbfbf7", padding: "56px 64px", borderRadius: 4, fontFamily: "serif", color: "#1e1d1a" }}>
          <div style={{ fontSize: 34, color: "#2347c5" }}>Dishwise</div>
          <div style={{ fontSize: 88, lineHeight: 1.02, marginTop: 12 }}>What should I order?</div>
          <div style={{ fontSize: 32, color: "#6b675e", marginTop: 24 }}>Reads the menu, circles what you&apos;ll love, and says why.</div>
        </div>
      </div>
    ),
    size,
  );
}

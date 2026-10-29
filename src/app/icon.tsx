import { ImageResponse } from "next/og";

// Provisional mark (owner to approve final branding): a ballpoint-blue circled "D" on paper.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fbfbf7", borderRadius: 14 }}>
        <div style={{ width: 52, height: 46, display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #2347c5", borderRadius: "50%", fontSize: 34, fontFamily: "serif", color: "#1e1d1a", fontWeight: 700 }}>D</div>
      </div>
    ),
    size,
  );
}

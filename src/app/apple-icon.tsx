import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#203d36" }}>
        <div style={{ width: 140, height: 124, display: "flex", alignItems: "center", justifyContent: "center", border: "8px solid #fbfbf7", borderRadius: "50%", fontSize: 92, fontFamily: "serif", color: "#fbfbf7", fontWeight: 700 }}>D</div>
      </div>
    ),
    size,
  );
}

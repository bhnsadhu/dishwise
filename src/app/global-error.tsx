"use client";

/** Last-resort boundary for errors in the root layout. Renders its own document without app styles. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#203d36", fontFamily: "Georgia, serif", color: "#1e1d1a" }}>
        <title>Something went wrong · Dishwise</title>
        <div style={{ background: "#fbfbf7", padding: 32, borderRadius: 3, maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Dishwise hit a problem</h1>
          <p style={{ color: "#6b675e" }}>Your taste card and ratings are safe on this device.</p>
          <button type="button" onClick={() => retry()} style={{ font: "inherit", padding: "10px 18px", border: "1.5px solid #1e1d1a", background: "#2347c5", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

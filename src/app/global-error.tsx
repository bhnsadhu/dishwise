"use client";

/** Last-resort boundary for errors in the root layout. Renders its own document without app styles. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#ffffff", fontFamily: "system-ui, sans-serif", color: "#1c1913" }}>
        <title>Something went wrong · Dishwise</title>
        <div style={{ background: "#f7f2e8", padding: 32, borderRadius: 20, maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Dishwise hit a problem</h1>
          <p style={{ color: "#6a6355" }}>Your taste and ratings are safe on this device.</p>
          <button type="button" onClick={() => retry()} style={{ font: "inherit", fontWeight: 700, padding: "12px 22px", border: 0, borderRadius: 999, background: "#f2a71b", color: "#1c1303", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

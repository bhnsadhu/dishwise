"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page pt-10">
      <div className="card mx-auto grid max-w-lg justify-items-center gap-3 p-8 text-center" role="alert">
        <h1 className="text-[28px] font-black tracking-[-0.03em]">This page hit a problem</h1>
        <p className="text-sub">Your taste and ratings are safe on this device. Try again, or head back home.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2.5">
          <button type="button" className="btn btn-primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

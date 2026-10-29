"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="wrap pt-6">
      <div className="paper mx-auto max-w-xl text-center" role="alert">
        <p className="font-hand text-[22px] text-red-pen">something spilled</p>
        <h1 className="mt-1 font-display text-[36px] leading-tight">This page hit a problem</h1>
        <p className="mt-2 text-muted">Your taste card and ratings are safe on this device. Try again, or head back to the menus.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" className="tag-btn primary" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/menus" className="tag-btn">
            Menus
          </Link>
        </div>
      </div>
    </div>
  );
}

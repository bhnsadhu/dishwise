"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RetryMenu() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Checking menu…" : "Check again"}</button>;
}

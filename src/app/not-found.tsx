import Link from "next/link";
import { CoverArt } from "@/components/cover-art";

export default function NotFound() {
  return (
    <div className="page pt-10">
      <div className="card mx-auto grid max-w-lg justify-items-center gap-3 p-8 text-center">
        <CoverArt className="h-24 w-auto" />
        <h1 className="text-[30px] font-black tracking-[-0.03em]">Page not found</h1>
        <p className="text-sub">That page isn&apos;t on the menu. It may have moved, or the link has a typo.</p>
        <Link href="/" className="btn btn-primary mt-2">
          Back to home
        </Link>
      </div>
    </div>
  );
}

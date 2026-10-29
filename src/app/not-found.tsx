import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap pt-6">
      <div className="paper mx-auto max-w-xl text-center">
        <p className="font-hand text-[22px] text-pen">not on the menu</p>
        <h1 className="mt-1 font-display text-[40px] leading-tight">Page not found</h1>
        <p className="mt-2 text-muted">That page doesn&apos;t exist. It may have moved, or the link has a typo.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/" className="tag-btn">
            Home
          </Link>
          <Link href="/menus" className="tag-btn primary">
            Open a menu
          </Link>
        </div>
      </div>
    </div>
  );
}

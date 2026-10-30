"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { authClient } from "@/lib/auth/client";
import { useStore } from "@/lib/client/store";

/** Auth errors arrive either as { error } results or thrown; normalise to a readable message. */
function authMessage(err: unknown): string {
  const e = err as { message?: string; error?: { message?: string }; status?: number } | null;
  const msg = e?.error?.message ?? e?.message;
  if (msg && !/^(failed to fetch|fetch failed|load failed)$/i.test(msg)) return msg;
  return "Couldn't reach the sign-in service. Check your connection and try again.";
}

export function AccountPage() {
  const { account, refreshAccount, signedOut, clearLocal, feedback, syncError } = useStore();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    let res: { error?: { message?: string } | null };
    try {
      res =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name.trim() || email.split("@")[0] });
    } catch (err) {
      res = { error: { message: authMessage(err) } };
    } finally {
      setBusy(false);
    }
    if (res.error) {
      setError(res.error.message || "That didn't work. Check your email and password.");
      return;
    }
    setPassword("");
    const state = await refreshAccount();
    if (state.status === "signed-in") {
      setNotice(mode === "sign-up" ? "Account created. Your taste card and ratings are now saved to it." : "Signed in. Your taste card and ratings are synced.");
    } else if (mode === "sign-up") {
      setNotice("Account created. Check your inbox to confirm your email, then sign in here.");
      setMode("sign-in");
    } else {
      setError("Signed in, but your account couldn't be loaded. Refresh the page and try again.");
    }
  }

  async function signOut() {
    try {
      await authClient.signOut();
    } catch {
      /* the session cookie is cleared server-side anyway; fall through to local sign-out */
    }
    signedOut();
    setNotice("Signed out. This device keeps a local copy.");
  }

  async function deleteEverything() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      setError("Couldn't delete your data. Try again.");
      return;
    }
    const del = await authClient.deleteUser().catch(() => ({ error: { message: "" } }));
    await authClient.signOut().catch(() => undefined);
    clearLocal();
    signedOut();
    setBusy(false);
    setConfirmDelete(false);
    setNotice(
      del && "error" in del && del.error
        ? "Your Dishwise data is deleted. The sign-in account itself couldn't be removed automatically; contact the site owner to finish."
        : "Your account and all Dishwise data are deleted.",
    );
  }

  const links: { href: string; label: string; sub: string; icon: IconName }[] = [
    { href: "/taste", label: "Your taste", sub: "Cuisines, ingredients, heat, diet, what to avoid", icon: "sliders" },
    { href: "/notebook", label: "Saved dishes", sub: `${feedback.length} saved or rated`, icon: "heart" },
    { href: "/how", label: "How Dishwise picks", sub: "The scoring, explained", icon: "book" },
  ];

  return (
    <div className="page grid gap-6 pt-4 md:pt-8">
      <h1 className="text-[30px] font-black tracking-[-0.03em] md:text-[40px]">{account.status === "signed-in" ? "Your account" : "You"}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card grid gap-5 p-5 md:p-7" aria-labelledby="acct-h">
          <h2 id="acct-h" className="text-[21px] font-extrabold tracking-[-0.015em]">
            {account.status === "signed-in" ? "Signed in" : "Keep your taste everywhere"}
          </h2>

          {notice && (
            <p role="status" className="flex gap-2 rounded-xl bg-ok-soft p-3 text-[15px] font-semibold text-ok">
              <Icon name="check" size={19} className="mt-0.5" />
              {notice}
            </p>
          )}
          {(error || syncError) && (
            <p role="alert" className="flex gap-2 rounded-xl bg-no-soft p-3 text-[15px] font-semibold text-no">
              <Icon name="alert" size={19} className="mt-0.5" />
              {error ?? syncError}
            </p>
          )}

          {account.status === "loading" && <p className="text-sub">Checking…</p>}

          {account.status === "unavailable" && <p className="text-sub">Accounts aren&apos;t switched on for this copy of Dishwise. Everything still works and is saved on this device.</p>}

          {account.status === "signed-in" && (
            <>
              <p className="text-[15.5px]">
                Signed in as <strong>{account.email}</strong>. Your taste and {feedback.length} rated or saved dish{feedback.length === 1 ? "" : "es"} sync to your account.
              </p>
              <button type="button" className="btn btn-secondary justify-self-start" onClick={signOut}>
                <Icon name="logout" size={18} />
                Sign out
              </button>
              <div className="grid gap-2 border-t border-line pt-5">
                <h3 className="text-[15px] font-bold">Delete</h3>
                {confirmDelete ? (
                  <div className="grid gap-3">
                    <p className="text-[15px]">This permanently deletes your account, taste, ratings and saved menus. It can&apos;t be undone.</p>
                    <div className="flex flex-wrap gap-2.5">
                      <button type="button" className="btn btn-danger" onClick={deleteEverything} disabled={busy}>
                        Delete everything
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="link justify-self-start text-no" onClick={() => setConfirmDelete(true)}>
                    Delete my account and data…
                  </button>
                )}
              </div>
            </>
          )}

          {account.status === "guest" && (
            <>
              <p className="text-[15px] text-sub">
                You don&apos;t need an account to use Dishwise. Signing in saves your taste and ratings so they follow you to other devices. What you&apos;ve done on this device comes with you.
              </p>
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-surf p-1.5" role="tablist" aria-label="Sign in or create an account">
                {(["sign-in", "sign-up"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`min-h-11 rounded-xl text-[15px] font-bold transition-colors ${mode === m ? "bg-card text-ink shadow-[var(--shadow)]" : "text-sub hover:text-ink"}`}
                  >
                    {m === "sign-in" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
              <form className="grid gap-4" onSubmit={submit}>
                {mode === "sign-up" && (
                  <label className="grid gap-1.5">
                    <span className="label">Name (optional)</span>
                    <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
                  </label>
                )}
                <label className="grid gap-1.5">
                  <span className="label">Email</span>
                  <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </label>
                <label className="grid gap-1.5">
                  <span className="label">Password</span>
                  <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} />
                </label>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
                </button>
              </form>
            </>
          )}
        </section>

        <nav aria-label="More" className="card overflow-hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-4 border-b border-line p-4 last:border-0 hover:bg-surf">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-brand-soft text-brand-text">
                <Icon name={l.icon} size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{l.label}</span>
                <span className="block truncate text-[13.5px] text-sub">{l.sub}</span>
              </span>
              <Icon name="forward" size={18} className="text-sub" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

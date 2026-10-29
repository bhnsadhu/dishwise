"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useStore } from "@/lib/client/store";

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
    const res =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name.trim() || email.split("@")[0] });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "That didn't work. Check your email and password.");
      return;
    }
    setPassword("");
    await refreshAccount();
    setNotice(mode === "sign-up" ? "Account created. Your taste card and ratings are now saved to it." : "Signed in. Your taste card and ratings are synced.");
  }

  async function signOut() {
    await authClient.signOut();
    signedOut();
    setNotice("Signed out. This device keeps a local copy.");
  }

  async function deleteEverything() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me", { method: "DELETE" });
    if (!res.ok) {
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

  return (
    <div className="wrap pt-4">
      <section className="paper mx-auto grid max-w-lg gap-5" aria-labelledby="acct-h">
        <h1 id="acct-h" className="font-display text-[36px] leading-none">
          {account.status === "signed-in" ? "Your account" : "Keep your taste everywhere"}
        </h1>

        {notice && <p role="status" className="font-hand text-[19px] text-pen">{notice}</p>}
        {(error || syncError) && <p role="alert" className="font-hand text-[19px] text-red-pen">{error ?? syncError}</p>}

        {account.status === "loading" && <p className="text-muted">Checking…</p>}

        {account.status === "unavailable" && <p className="text-muted">Accounts aren&apos;t switched on for this copy of Dishwise. Everything still works and is saved on this device.</p>}

        {account.status === "signed-in" && (
          <>
            <p>
              Signed in as <strong>{account.email}</strong>. Your taste card and {feedback.length} rated or saved dish{feedback.length === 1 ? "" : "es"} sync to your account.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="tag-btn" onClick={signOut}>
                Sign out
              </button>
            </div>
            <div className="border-t border-rule pt-4">
              <h2 className="label">Delete</h2>
              {confirmDelete ? (
                <div className="mt-2 grid gap-2">
                  <p>This permanently deletes your account, taste card, ratings and saved menus. It can&apos;t be undone.</p>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="tag-btn border-red-pen text-red-pen" onClick={deleteEverything} disabled={busy}>
                      Delete everything
                    </button>
                    <button type="button" className="link-pen" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="link-pen mt-2 text-red-pen" onClick={() => setConfirmDelete(true)}>
                  Delete my account and data…
                </button>
              )}
            </div>
          </>
        )}

        {account.status === "guest" && (
          <>
            <p className="text-muted">
              You don&apos;t need an account to use Dishwise. Signing in saves your taste card and ratings so they follow you to other devices. What you&apos;ve done on this device comes with you.
            </p>
            <div className="flex gap-6 border-b border-rule pb-2" role="tablist" aria-label="Sign in or create an account">
              {(["sign-in", "sign-up"] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`font-display text-[22px] ${mode === m ? "text-ink underline decoration-pen decoration-2 underline-offset-8" : "text-muted"}`}>
                  {m === "sign-in" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
            <form className="grid gap-4" onSubmit={submit}>
              {mode === "sign-up" && (
                <label className="grid gap-1">
                  <span className="label">Name (optional)</span>
                  <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
                </label>
              )}
              <label className="grid gap-1">
                <span className="label">Email</span>
                <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </label>
              <label className="grid gap-1">
                <span className="label">Password</span>
                <input
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                />
              </label>
              <button type="submit" className="tag-btn primary justify-self-start" disabled={busy}>
                {busy ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

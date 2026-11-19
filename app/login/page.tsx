"use client";
// Sign-in (BR-01) and the first-sign-in password change after a temporary password (BR-14).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errMsg, post } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useApp } from "@/components/providers";

export default function LoginPage() {
  const { me, setMe, loading } = useApp();
  const router = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && me && !me.must_change_password) router.replace("/upload");
  }, [me, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u.trim() || !p) { setErr("Enter your username and password."); return; }
    setBusy(true);
    setErr(null);
    try { setMe(await post<Me>("/api/auth/login", { username: u, password: p })); }
    catch (x) { setErr(errMsg(x)); }
    finally { setBusy(false); }
  };

  return (
    <section id="login">
      {me?.must_change_password ? <ChangePassword /> : (
        <form className="login-card" onSubmit={submit} noValidate>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/ais-logo.png" alt="AIS" />
          <h1 style={{ fontSize: 22 }}>Check Extraction</h1>
          <div className="muted">Morgan &amp; Morgan referral checks</div>
          <div className="field"><label htmlFor="u">Username</label>
            <input className="input" id="u" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} autoFocus /></div>
          <div className="field"><label htmlFor="p">Password</label>
            <input className="input" id="p" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></div>
          {err && <div className="err">{err}</div>}
          <button className="btn primary" style={{ width: "100%", marginTop: 20, padding: 10 }} type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}</button>
        </form>
      )}
    </section>
  );
}

function ChangePassword() {
  const { me, setMe } = useApp();
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (n1 !== n2) { setErr("The two new passwords are not the same."); return; }
    try {
      setMe(await post<Me>("/api/auth/change-password", { current_password: cur, new_password: n1 }));
      router.replace("/upload");
    } catch (x) { setErr(errMsg(x)); }
  };
  const signOut = async () => { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); setMe(null); };
  return (
    <form className="login-card" onSubmit={submit} noValidate>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/ais-logo.png" alt="AIS" />
      <h1 style={{ fontSize: 22 }}>Set a new password</h1>
      <div className="muted">Hello {me?.name}. You signed in with a temporary password; choose your own to continue.</div>
      <div className="field"><label htmlFor="c">Temporary password</label>
        <input className="input" id="c" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} autoFocus /></div>
      <div className="field"><label htmlFor="n1">New password</label>
        <input className="input" id="n1" type="password" autoComplete="new-password" value={n1} onChange={(e) => setN1(e.target.value)} /></div>
      <div className="field"><label htmlFor="n2">Repeat new password</label>
        <input className="input" id="n2" type="password" autoComplete="new-password" value={n2} onChange={(e) => setN2(e.target.value)} /></div>
      <div className="faint" style={{ fontSize: 12.5, marginTop: 8 }}>At least 10 characters, with letters and a digit.</div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary" style={{ width: "100%", marginTop: 20, padding: 10 }} type="submit">Save password</button>
      <button className="link" type="button" style={{ marginTop: 14 }} onClick={signOut}>Sign out</button>
    </form>
  );
}

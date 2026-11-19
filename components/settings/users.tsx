"use client";
// Settings > Users (BR-14, BR-16): users and roles, temporary passwords, unlock, deactivate, recent activity.
import { useCallback, useEffect, useState } from "react";
import { api, errMsg, post } from "@/lib/api";
import { fmtDate, fmtDT } from "@/lib/format";
import type { Role } from "@/lib/types";
import { SmallModal } from "@/components/modal";
import { useApp } from "@/components/providers";

interface U { id: number; name: string; username: string; role: Role; status: "Active" | "Locked" | "Deactivated"; created_at: string; last_signin: string | null }
interface Act { at: string; actor: string; category: string; subject: string | null; event: string }

const ROLE_TABS: Record<Role, string> = {
  Reviewer: "Upload Checks · Review · Results · Dashboard",
  Administrator: "All tabs: Upload Checks (with batch history) · Review · OCR · Classification · Extraction · Results · Dashboard · Settings",
};
const ST: Record<string, string> = { Active: "p-auto", Locked: "p-pending", Deactivated: "p-excluded" };
type F = "all" | Role | "Locked" | "Deactivated";

export function UsersSection() {
  const { me, toast } = useApp();
  const [users, setUsers] = useState<U[]>([]);
  const [acts, setActs] = useState<Act[]>([]);
  const [f, setF] = useState<F>("all");
  const [edit, setEdit] = useState<U | "new" | null>(null);
  const [pw, setPw] = useState<{ u: U; pw: string; title: string } | null>(null);
  const load = useCallback(() => {
    api<U[]>("/api/admin/users").then(setUsers).catch(() => {});
    api<Act[]>("/api/admin/activity?limit=12").then(setActs).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const c: Record<F, number> = { all: users.length, Reviewer: 0, Administrator: 0, Locked: 0, Deactivated: 0 };
  users.forEach((u) => { c[u.role]++; if (u.status !== "Active") c[u.status]++; });
  const shown = users.filter((u) => f === "all" || u.role === f || u.status === f);
  const act = async (u: U, a: "unlock" | "reactivate" | "reset") => {
    try {
      if (a === "reset") { const r = await post<{ temp_password: string }>(`/api/admin/users/${u.id}/reset-password`); setPw({ u, pw: r.temp_password, title: "Password reset" }); }
      else { await post(`/api/admin/users/${u.id}/${a}`); toast(`${u.username} ${a === "unlock" ? "unlocked" : "reactivated"}`); }
      load();
    } catch (e) { toast(errMsg(e)); }
  };

  return (<>
    <div className="section-head">
      <div><h2>Users</h2>{c.Locked > 0 && <p className="alert">{c.Locked} account(s) locked</p>}</div>
      <button className="btn primary" onClick={() => setEdit("new")}>+ Add user</button>
    </div>
    <div className="filters">
      {([["all", "All"], ["Reviewer", "Reviewers"], ["Administrator", "Administrators"], ["Locked", "Locked"], ["Deactivated", "Deactivated"]] as [F, string][]).map(([k, l]) => (
        <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{l}<b className="num">{c[k]}</b></button>
      ))}
    </div>
    <div className="table-wrap"><table className="data"><thead><tr>
      <th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Last sign-in</th><th />
    </tr></thead><tbody>
      {shown.map((u) => (
        <tr key={u.id}>
          <td style={{ fontWeight: 500 }}>{u.name}{u.username === me?.username && <span className="faint" style={{ fontWeight: 400 }}> (you)</span>}</td>
          <td className="mono">{u.username}</td>
          <td><span className={`tag ${u.role === "Administrator" ? "" : "grey"}`}>{u.role}</span></td>
          <td><span className={`pill ${ST[u.status]}`}>{u.status}</span></td>
          <td className="num muted">{fmtDate(u.created_at)}</td>
          <td className="muted">{u.last_signin ? fmtDT(u.last_signin) : "Never"}</td>
          <td className="r" style={{ whiteSpace: "nowrap" }}>
            <button className="btn sm" onClick={() => setEdit(u)}>Edit</button>{" "}
            {u.status === "Locked" ? <button className="btn sm" onClick={() => act(u, "unlock")}>Unlock</button>
              : u.status === "Deactivated" ? <button className="btn sm" onClick={() => act(u, "reactivate")}>Reactivate</button>
                : <button className="btn sm" onClick={() => act(u, "reset")}>Reset password</button>}
          </td>
        </tr>
      ))}
    </tbody></table></div>

    <div className="grid2" style={{ marginTop: 22 }}>
      <div className="panel"><div className="panel-head"><h2>Role access</h2></div><div className="table-wrap"><table className="data"><thead><tr><th>Role</th><th>Tabs visible</th></tr></thead><tbody>
        <tr><td><span className="tag grey">Reviewer</span></td><td>{ROLE_TABS.Reviewer}</td></tr>
        <tr><td><span className="tag">Administrator</span></td><td style={{ whiteSpace: "normal" }}>{ROLE_TABS.Administrator}</td></tr>
      </tbody></table></div></div>
      <div className="panel"><div className="panel-head"><h2>Recent activity</h2></div><div className="table-wrap"><table className="data"><thead><tr><th>When</th><th>User</th><th>Event</th><th>By</th></tr></thead><tbody>
        {acts.map((a, i) => (
          <tr key={i}><td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDT(a.at)}</td><td className="mono">{a.subject || "—"}</td>
            <td style={{ whiteSpace: "normal" }}>{a.event}</td><td className="muted">{a.actor}</td></tr>
        ))}
      </tbody></table></div></div>
    </div>

    {edit && <UserModal u={edit === "new" ? null : edit} onClose={() => setEdit(null)}
      onCreated={(u, p) => { setEdit(null); setPw({ u, pw: p, title: "User created" }); load(); }}
      onSaved={(m) => { setEdit(null); toast(m); load(); }} />}
    {pw && <PwModal {...pw} onClose={() => setPw(null)} />}
  </>);
}

function UserModal({ u, onClose, onCreated, onSaved }: { u: U | null; onClose: () => void; onCreated: (u: U, pw: string) => void; onSaved: (m: string) => void }) {
  const { me } = useApp();
  const [name, setName] = useState(u?.name || "");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>(u?.role || "Reviewer");
  const [deact, setDeact] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      if (!u) { const r = await post<{ user: U; temp_password: string }>("/api/admin/users", { name, username, role }); onCreated(r.user, r.temp_password); }
      else {
        const r = await api<{ changes: string[] }>(`/api/admin/users/${u.id}`, { method: "PATCH", json: { name, role, deactivate: deact } });
        onSaved(r.changes.length ? `${u.username}: ${r.changes.join(", ")}` : "No changes");
      }
    } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <SmallModal title={u ? "Edit user" : "Add user"} sub={u ? <span className="mono">{u.username}</span> : undefined} onClose={onClose}>
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field" style={{ margin: 0 }}><label htmlFor="uName">Full name</label>
          <input className="input" id="uName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma" autoFocus /></div>
        {!u && <div className="field" style={{ margin: 0 }}><label htmlFor="uUser">Username</label>
          <input className="input" id="uUser" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. priya.sharma" /></div>}
        <div className="field" style={{ margin: 0 }}><label>Role</label>
          {(["Reviewer", "Administrator"] as Role[]).map((r) => (
            <label key={r} className="role-opt"><input type="radio" name="uRole" checked={role === r} onChange={() => setRole(r)} />
              <span><b>{r}</b>{ROLE_TABS[r]}</span></label>
          ))}</div>
        {u && u.status !== "Deactivated" && u.username !== me?.username && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "var(--bad)" }}>
            <input type="checkbox" checked={deact} onChange={(e) => setDeact(e.target.checked)} style={{ accentColor: "var(--bad)" }} />
            Deactivate this user (they can no longer sign in; history is kept)</label>
        )}
        {err && <div className="err">{err}</div>}
        <div className="actions" style={{ justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn primary" type="submit">{u ? "Save changes" : "Create user"}</button>
        </div>
      </form>
    </SmallModal>
  );
}

function PwModal({ u, pw, title, onClose }: { u: U; pw: string; title: string; onClose: () => void }) {
  const { toast } = useApp();
  return (
    <SmallModal title={title} width={480} onClose={onClose} sub={<>{u.name} · <span className="mono">{u.username}</span> · {u.role}</>}>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>One-time temporary password</div>
      <div className="temp-pw"><span style={{ flex: 1 }}>{pw}</span>
        <button className="btn sm" type="button" onClick={() => navigator.clipboard.writeText(pw).then(() => toast("Copied"), () => toast("Select the password and press Ctrl+C"))}>Copy</button></div>
      <div className="muted" style={{ fontSize: 13 }}>Shown only once. Share it with the user securely; they must set a new password at first sign-in.</div>
      <div className="actions" style={{ justifyContent: "flex-end" }}><button className="btn primary" onClick={onClose}>Done</button></div>
    </SmallModal>
  );
}

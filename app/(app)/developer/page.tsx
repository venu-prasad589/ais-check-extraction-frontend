"use client";
// Developer Portal (Administrators): Granite Vision 4.1 prompt versions, field rules with lock, history with restore.
import { useCallback, useEffect, useState } from "react";
import { api, errMsg, post } from "@/lib/api";
import { fmtDT, pct } from "@/lib/format";
import { useApp } from "@/components/providers";

interface Rule { field: string; text: string; locked: boolean }
interface Ver { version: number; system_prompt: string; user_prompt: string; rules: Rule[]; note: string; by: string; at: string; active: boolean }
interface Dev {
  model: string; host: string; granite_url: string; threshold: number; confidence: string;
  today: { auto: number; manual: number; pending: number }; active: Ver | null; history: Ver[]; wired_to_pipeline: boolean;
}

const LockIcon = ({ on }: { on: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d={on ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} />
  </svg>
);

export default function DeveloperPage() {
  const { toast } = useApp();
  const [d, setD] = useState<Dev | null>(null);
  const [edit, setEdit] = useState<string | null>(null);   // "system" | "user" | "rule-<i>"
  const [text, setText] = useState("");
  const load = useCallback(() => api<Dev>("/api/admin/developer").then(setD).catch((e) => toast(errMsg(e))), [toast]);
  useEffect(() => { load(); }, [load]);
  if (!d) return null;
  const a = d.active;

  const start = (key: string, value: string) => { setEdit(key); setText(value); };
  const save = async () => {
    if (!a || !edit) return;
    try {
      let body: Record<string, unknown>;
      if (edit.startsWith("rule-")) {
        const i = +edit.slice(5);
        body = { rules: a.rules.map((r, j) => (j === i ? { ...r, text } : r)), note: `Field rule updated: ${a.rules[i].field}` };
      } else body = edit === "system" ? { system_prompt: text } : { user_prompt: text };
      const v = await post<Ver>("/api/admin/developer/prompts", body);
      toast(v.version !== a.version ? `Saved as v${v.version}` : "No changes");
      setEdit(null);
      load();
    } catch (e) { toast(errMsg(e)); }
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setEdit(null);
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  };
  const card = (key: "system" | "user", title: string, value: string) => (
    <div className="dev-card"><div className="dev-card-head"><h2>{title}</h2>{edit !== key && <button className="btn sm" onClick={() => start(key, value)}>Edit</button>}</div>
      {edit === key ? (<>
        <textarea className="prompt-edit" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} aria-label={title} autoFocus style={{ minHeight: 260 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button className="btn sm primary" onClick={save}>Save</button><button className="btn sm" onClick={() => setEdit(null)}>Cancel</button>
          <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>Ctrl+Enter to save · Esc to cancel</span></div>
      </>) : <pre className="prompt-box" style={{ maxHeight: 320, overflow: "auto" }}>{value || <span className="faint">(none - no system message is sent)</span>}</pre>}
    </div>
  );

  return (<>
    <div className="page-head"><div><h1>Developer Portal<span className="dev-badge">Administrators only</span></h1></div></div>
    <div className="infobar" style={{ marginBottom: 16 }}>
      A saved change creates a new version that Granite Vision uses from the next file processed. The User Prompt must keep
      <span className="mono"> {"{schema}"}</span> (where the JSON schema with the field rules goes) and may use
      <span className="mono"> {"{what}"}</span> (what the image is, e.g. “bank check image”). An empty System Prompt means no system message is sent.</div>
    <div className="tiles" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
      <div className="tile"><div className="eyebrow">Auto-approved today</div><div className="v num" style={{ color: "var(--accent)" }}>{d.today.auto}</div><div className="sub">all 6 fields at or above {pct(d.threshold)}</div></div>
      <div className="tile"><div className="eyebrow">Manually reviewed today</div><div className="v num" style={{ color: "var(--accent)" }}>{d.today.manual}</div><div className="sub">values confirmed by a reviewer</div></div>
      <div className="tile"><div className="eyebrow">Waiting for review</div><div className="v num" style={{ color: "var(--accent)" }}>{d.today.pending}</div><div className="sub">below threshold, in the Review tab</div></div>
    </div>
    <div className="dev-card"><h2 style={{ marginBottom: 12 }}>Model · Check extraction</h2><dl className="kv2">
      <dt>Model</dt><dd className="mono">{d.model}</dd><dt>Hosting</dt><dd>{d.host} ({d.granite_url})</dd>
      <dt>Auto-approve at</dt><dd>{pct(d.threshold)} confidence</dd><dt>Confidence from</dt><dd>{d.confidence}</dd>
      <dt>Prompt version</dt><dd>{a ? `v${a.version} · ${a.by}, ${fmtDT(a.at)}` : "None yet - run python -m api.cli seed-prompts"}</dd></dl></div>
    {a && <>
      {card("system", "System Prompt", a.system_prompt)}
      {card("user", "User Prompt", a.user_prompt)}
      <div className="dev-card"><h2>Field Rules</h2>
        <div className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>One rule per field (the field description Granite reads). Lock a rule to stop automatic updates.</div>
        {a.rules.map((r, i) => (
          <div key={r.field} className="rule-row"><div className="rf">{r.field}</div>
            {edit === `rule-${i}` ? (
              <div><textarea className="prompt-edit" style={{ minHeight: 90 }} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={keys} autoFocus aria-label={`${r.field} rule`} />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}><button className="btn sm primary" onClick={save}>Save</button><button className="btn sm" onClick={() => setEdit(null)}>Cancel</button></div></div>
            ) : <div className={`rt ${r.text ? "" : "unset"}`}>{r.text || "Not yet learned"}</div>}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {edit !== `rule-${i}` && <button className="btn sm" onClick={() => start(`rule-${i}`, r.text)}>Edit</button>}
              <button className={`lock ${r.locked ? "on" : ""}`} title={r.locked ? "Locked – click to unlock" : "Unlocked – click to lock"}
                aria-label={`${r.locked ? "Unlock" : "Lock"} ${r.field} rule`}
                onClick={async () => { try { await post(`/api/admin/developer/rules/${i}/lock`); toast(`${r.field} rule ${r.locked ? "unlocked" : "locked"}`); load(); } catch (e) { toast(errMsg(e)); } }}>
                <LockIcon on={r.locked} /></button>
            </div>
          </div>
        ))}
      </div>
    </>}
    <div className="dev-card"><h2 style={{ marginBottom: 10 }}>Prompt History</h2><div className="table-wrap"><table className="data" style={{ minWidth: 0 }}><thead><tr>
      <th>Version</th><th>Changed by</th><th>When</th><th>Change</th><th /></tr></thead><tbody>
      {d.history.map((h) => (
        <tr key={h.version}><td className="num">v{h.version}{h.active && <> <span className="pill p-auto">Active</span></>}</td>
          <td className="mono">{h.by}</td><td className="muted">{fmtDT(h.at)}</td><td style={{ whiteSpace: "normal" }}>{h.note}</td>
          <td className="r">{!h.active && <button className="btn sm" onClick={async () => { try { const v = await post<Ver>(`/api/admin/developer/prompts/${h.version}/restore`); toast(`Restored as v${v.version}`); load(); } catch (e) { toast(errMsg(e)); } }}>Restore</button>}</td></tr>
      ))}
    </tbody></table></div></div>
  </>);
}

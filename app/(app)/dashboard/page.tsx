"use client";
// Dashboard: totals and items waiting for review for a date range.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDT, pct, rLabel, todayRange, type Range } from "@/lib/format";
import { DateRange } from "@/components/daterange";

type C = { auto: number; pending: number; manual: number };
interface Dash {
  files: number; errors: number; pages: number; checks: number; auto: number; manual: number; waiting: number;
  waiting_cls: number; waiting_ext: number; queue: number; threshold: number;
  stages: { ocr: number; classification: C; extraction: C }; last_batch: { id: string; uploaded_at: string } | null;
}

export default function DashboardPage() {
  const [r, setR] = useState<Range>(todayRange);
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => {
    const load = () => api<Dash>(`/api/dashboard?from=${r.from}&to=${r.to}`).then(setD).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [r]);
  const tiles: [string, number | string, string][] = d ? [
    ["Files processed", d.files, d.errors ? `${d.errors} in Error` : ""], ["Pages processed", d.pages, ""], ["Checks found", d.checks, ""],
    ["Auto-approved", d.auto, d.checks ? pct(d.auto / d.checks) + " of checks" : ""],
    ["Waiting for review", d.waiting, `Classification ${d.waiting_cls} · Extraction ${d.waiting_ext}`], ["Manually approved", d.manual, ""],
  ] : [];
  const row = (n: string, c: C) => (
    <tr><td>{n}</td><td className="r num">{c.auto}</td>
      <td className="r num">{c.pending ? <span style={{ color: "var(--warn)", fontWeight: 600 }}>{c.pending}</span> : 0}</td>
      <td className="r num">{c.manual}</td></tr>
  );
  return (<>
    <div className="page-head">
      <div><h1>Dashboard</h1>{d && !d.pages && <p className="alert">No checks were processed on {rLabel(r)}</p>}</div>
      <div className="actions"><DateRange value={r} onChange={setR} /></div>
    </div>
    <div className="tiles">{tiles.map(([l, v, s]) => (
      <div key={l} className="tile"><div className="eyebrow">{l}</div><div className="v num">{v}</div>{s && <div className="sub">{s}</div>}</div>
    ))}</div>
    {d && <div className="grid2">
      <div className="panel"><div className="panel-head"><h2>Pipeline by stage · {rLabel(r)}</h2></div>
        <div className="table-wrap"><table className="data"><thead><tr><th>Stage</th><th className="r">Auto</th><th className="r">Pending</th><th className="r">Manual</th></tr></thead><tbody>
          <tr><td>OCR <span className="faint" style={{ fontSize: 12 }}>(no review)</span></td><td className="r num">{d.stages.ocr}</td><td className="r faint">—</td><td className="r faint">—</td></tr>
          {row("Classification", d.stages.classification)}{row("Extraction", d.stages.extraction)}
        </tbody></table></div></div>
      <div className="panel"><div className="panel-head"><h2>Processing status</h2></div>
        <div className="table-wrap"><table className="data"><tbody>
          <tr><td className="muted">Files waiting to be processed (now)</td><td className="r num">{d.queue}</td></tr>
          <tr><td className="muted">Last batch uploaded</td><td className="r">{d.last_batch ? <><span className="mono">{d.last_batch.id}</span> · {fmtDT(d.last_batch.uploaded_at)}</> : "—"}</td></tr>
          <tr><td className="muted">OCR model</td><td className="r">Nemotron OCR v2</td></tr>
          <tr><td className="muted">Classifier</td><td className="r">TF-IDF + Logistic Regression</td></tr>
          <tr><td className="muted">Extraction model</td><td className="r">Granite Vision 4.1</td></tr>
          <tr><td className="muted">Auto-approve threshold</td><td className="r num">{pct(d.threshold)}</td></tr>
        </tbody></table></div></div>
    </div>}
  </>);
}

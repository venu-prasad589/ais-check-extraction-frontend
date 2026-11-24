"use client";
// Results (BR-12): the final output, one row per check, exactly the Export columns. Export Excel (BR-13).
import { useCallback, useEffect, useState } from "react";
import { api, download, errMsg } from "@/lib/api";
import { fmtCheckDate, fmtD, fmtDT, money, rLabel, short, todayRange, type Range } from "@/lib/format";
import type { ExtView, FieldKey } from "@/lib/types";
import { DateRange } from "@/components/daterange";
import { SmallModal } from "@/components/modal";
import { useApp } from "@/components/providers";
import { ReviewDialog } from "@/components/review";

type S = "all" | "auto" | "manual" | "pending";
interface Res { from: string; to: string; counts: Record<S | "error", number>; rows: ExtView[] }
const PILL: Record<string, [string, string]> = {
  auto: ["p-auto", "Auto-approved"], manual: ["p-manual", "Manually approved"], pending: ["p-pending", "Pending review"],
  queued: ["p-pending", "Pending review"], error: ["p-excluded", "Error"],
};

export default function ResultsPage() {
  const [r, setR] = useState<Range>(todayRange);
  const [f, setF] = useState<S>("all");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Res | null>(null);
  const [rev, setRev] = useState<number | null>(null);
  const [exp, setExp] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams({ from: r.from, to: r.to, status: f, q });
    api<Res>(`/api/results?${p}`).then(setData).catch(() => {});
  }, [r, f, q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const rows = data?.rows || [];
  const all = data?.counts.all ?? 0;
  return (<>
    <div className="page-head">
      <div><h1>Results</h1>{!!data?.counts.pending && <p className="alert">{data.counts.pending} check(s) still pending review</p>}</div>
      <div className="actions"><DateRange value={r} onChange={setR} /><button className="btn primary" onClick={() => setExp(true)}>⤓ Export Excel</button></div>
    </div>
    <div className="filters">
      {([["all", "All"], ["auto", "Auto-approved"], ["manual", "Manually approved"], ["pending", "Pending review"]] as [S, string][]).map(([k, l]) => (
        <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{l}<b className="num">{data?.counts[k] ?? 0}</b></button>
      ))}
      <span className="spacer" />
      <input className="input" style={{ maxWidth: 280 }} placeholder="Search payor, check # or file" aria-label="Search results" value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
    <div className="table-wrap"><table className="data res"><thead><tr>
      <th>File Name</th><th className="r">Page</th><th>Payor Name</th><th>Payor Address</th><th>Pay To</th><th>Check Number</th>
      <th>Check Date</th><th className="r">Check Amount</th><th>Status</th><th>Reviewed By</th><th>Processed At</th>
    </tr></thead><tbody>
      {rows.map((e) => {
        const pend = e.status === "pending";
        const lo = (k: FieldKey) => (pend && e.low_fields.includes(k) ? { background: "var(--warn-soft)" } : undefined);
        const st = PILL[e.status] || ["", e.status_label];
        return (
          <tr key={e.ext_id} onClick={pend ? () => setRev(e.ext_id) : undefined} style={pend ? { cursor: "pointer" } : undefined} title={pend ? "Open review" : undefined}>
            <td className="mono" title={e.file}>{short(e.file)}</td><td className="r num">{e.page}</td>
            <td style={lo("payor")}>{e.values.payor}</td>
            <td className="addr" style={{ fontSize: 13, ...lo("address") }}>{e.values.address}</td>
            <td style={lo("pay_to")}>{e.values.pay_to}</td>
            <td className="num" style={lo("check_no")}>{e.values.check_no}</td>
            <td className="num" style={lo("check_date")}>{fmtCheckDate(e.values.check_date)}</td>
            <td className="r num" style={lo("amount")}>{money(e.values.amount)}</td>
            <td><span className={`pill ${st[0]}`}>{st[1]}</span></td>
            <td className="muted">{e.reviewed_by || ""}</td><td className="num muted">{fmtDT(e.processed_at)}</td>
          </tr>
        );
      })}
      {data && !rows.length && <tr><td colSpan={11} className="empty">{all ? "No checks match this filter." : `No checks were processed on ${rLabel(r)}.`}</td></tr>}
      {!data && <tr><td colSpan={11} className="empty">Loading…</td></tr>}
    </tbody></table></div>
    <div className="foot">{rows.length} of {all} check(s) · pending rows open the review screen when clicked</div>
    {rev != null && <ReviewDialog start={{ type: "ext", id: rev }} onClose={() => { setRev(null); load(); }} />}
    {exp && <ExportModal start={r} onClose={() => setExp(false)} />}
  </>);
}

function ExportModal({ start, onClose }: { start: Range; onClose: () => void }) {
  const { toast } = useApp();
  const [r, setR] = useState<Range>(start);
  const [info, setInfo] = useState<{ all: number; pending: number } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Res>(`/api/results?from=${r.from}&to=${r.to}`).then((d) => setInfo({ all: d.counts.all, pending: d.counts.pending })).catch(() => {});
  }, [r]);
  const dd = (k: string) => fmtD(k).split("/").map((v) => v.padStart(2, "0")).join(".");
  const name = `Morgan_Check_Results_${dd(r.from)}${r.from === r.to ? "" : "-" + dd(r.to)}.xlsx`;
  const go = async () => {
    setBusy(true);
    try { const d = await download(`/api/results/export?from=${r.from}&to=${r.to}`); toast(`Downloaded ${d.name} · ${d.rows} rows`); onClose(); }
    catch (e) { toast(errMsg(e)); setBusy(false); }
  };
  return (
    <SmallModal title="Export to Excel" sub="Every check processed in the selected date range" onClose={onClose} overflowVisible>
      <DateRange value={r} onChange={setR} />
      {info && !info.all && <div className="infobar">No checks were processed on {rLabel(r)}, so no file is created.</div>}
      {info && info.pending > 0 && <div className="lockbar">{info.pending} of {info.all} checks still need review. They are included with Status “Pending review”.</div>}
      <div style={{ fontSize: 13, background: "var(--sunk)", borderRadius: 8, padding: "12px 14px", lineHeight: 1.7 }}>
        <strong>File</strong> {name}<br /><strong>Rows</strong> <span className="num">{info?.all ?? "…"}</span><br />
        <strong>Columns</strong> File Name, Page, Payor Name, Payor Address, Pay To, Check Number, Check Date, Check Amount, Status, Reviewed By, Processed At
      </div>
      <div className="actions" style={{ justifyContent: "flex-end" }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!info?.all || busy} onClick={go}>{info?.pending ? "Export anyway" : "Export"}</button>
      </div>
    </SmallModal>
  );
}

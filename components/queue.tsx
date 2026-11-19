"use client";
// Shared layout of the Classification and Extraction tabs (Administrators): All / Auto / Pending /
// Manual filters, one row per item, Open in Review.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ReviewDialog, type Target } from "./review";

type S = "all" | "auto" | "pending" | "manual";
export interface QueueRow { id: number; status: string; ext_id?: number }

export function QueueView<R extends QueueRow>({ title, url, type, pendingTxt, cols, row, results }: {
  title: string; url: string; type: "cls" | "ext"; pendingTxt: (n: number) => string;
  cols: string[]; row: (r: R) => React.ReactNode; results?: boolean;
}) {
  const [f, setF] = useState<S>("all");
  const [data, setData] = useState<{ counts: Record<S, number>; rows: R[] } | null>(null);
  const [open, setOpen] = useState<{ t: Target; seq: boolean } | null>(null);
  const load = useCallback(() => api<{ counts: Record<S, number>; rows: R[] }>(`${url}?status=${f}`).then(setData).catch(() => {}), [url, f]);
  useEffect(() => { load(); }, [load]);
  const np = data?.counts.pending ?? 0;
  const idOf = (r: R) => (type === "ext" ? r.ext_id! : r.id);
  const firstPending = data?.rows.find((r) => r.status === "pending");
  return (<>
    <div className="page-head">
      <div><h1>{title}</h1>{np > 0 && <p className="alert">{pendingTxt(np)}</p>}</div>
      <div className="actions">
        <Link className={`btn primary ${np ? "" : "disabled"}`} href="/review" aria-disabled={!np}
          onClick={(e) => { if (!np) e.preventDefault(); }} style={np ? undefined : { opacity: .45, pointerEvents: "none" }}>Open in Review ({np})</Link>
        {results && <Link className="btn" href="/results">See all results</Link>}
      </div>
    </div>
    <div className="filters">
      {([["all", "All"], ["auto", "Auto"], ["pending", "Pending"], ["manual", "Manual"]] as [S, string][]).map(([k, l]) => (
        <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{l}<b className="num">{data?.counts[k] ?? 0}</b></button>
      ))}
    </div>
    <div className="table-wrap"><table className="data"><thead><tr>
      {cols.map((h) => <th key={h} className={h.startsWith(">") ? "r" : ""}>{h.replace(">", "")}</th>)}<th />
    </tr></thead><tbody>
      {(data?.rows || []).map((r) => (
        <tr key={r.id}>{row(r)}<td className="r">
          {r.status === "pending"
            ? <button className="btn sm outline-accent" onClick={() => setOpen({ t: { type, id: idOf(r) }, seq: false })}>Review</button>
            : <button className="btn sm" onClick={() => setOpen({ t: { type, id: idOf(r) }, seq: false })}>View</button>}
        </td></tr>
      ))}
      {data && !data.rows.length && <tr><td colSpan={cols.length + 1} className="empty">Nothing here for this filter.</td></tr>}
      {!data && <tr><td colSpan={cols.length + 1} className="empty">Loading…</td></tr>}
    </tbody></table></div>
    <div className="foot">{data?.rows.length ?? 0} row(s) shown{firstPending ? "" : ""}</div>
    {open && <ReviewDialog start={open.t} filter={type} sequence={open.seq} onClose={() => { setOpen(null); load(); }} />}
  </>);
}

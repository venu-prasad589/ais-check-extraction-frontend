"use client";
// Review: every pending classification, extraction and duplicate-file item in one list (BR-09, BR-05).
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDT, short } from "@/lib/format";
import type { ReviewItem } from "@/lib/types";
import { ReviewDialog, type Target } from "@/components/review";

type F = "all" | "cls" | "ext" | "dup";
const TYPE_LABEL = { cls: "Classification", ext: "Extraction", dup: "Duplicate file" };

export default function ReviewPage() {
  const [f, setF] = useState<F>("all");
  const [data, setData] = useState<{ counts: Record<F, number>; items: ReviewItem[] } | null>(null);
  const [open, setOpen] = useState<{ t: Target; seq: boolean } | null>(null);

  const load = useCallback(() => api<{ counts: Record<F, number>; items: ReviewItem[] }>(`/api/review?type=${f}`).then(setData).catch(() => {}), [f]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) return; const t = setInterval(load, 8000); return () => clearInterval(t); }, [load, open]);

  const items = data?.items || [];
  const startable = items.filter((i) => !(i.lock && !i.lock.mine) && !i.queued);

  return (<>
    <div className="page-head">
      <div><h1>Review</h1>{data && data.counts.all > 0 && <p className="alert">{data.counts.all} item(s) waiting for review</p>}</div>
      <div className="actions"><button className="btn primary" disabled={!startable.length}
        onClick={() => setOpen({ t: { type: startable[0].type, id: startable[0].id }, seq: true })}>Start Review ({startable.length})</button></div>
    </div>
    <div className="filters">
      {([["all", "All"], ["cls", "Classification"], ["ext", "Extraction"], ["dup", "Duplicates"]] as [F, string][]).map(([k, l]) => (
        <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{l}<b className="num">{data?.counts[k] ?? 0}</b></button>
      ))}
    </div>
    <div className="table-wrap"><table className="data"><thead><tr>
      <th>Review type</th><th>Batch</th><th>Processed</th><th>File</th><th className="r">Page</th><th />
    </tr></thead><tbody>
      {items.map((x) => (
        <tr key={x.type + x.id}>
          <td><span className={`tag ${x.type === "ext" ? "" : x.type === "dup" ? "review" : "grey"}`}>{TYPE_LABEL[x.type]}</span></td>
          <td className="batch-id">{x.batch}</td>
          <td className="num">{fmtDT(x.processed_at)}</td>
          <td className="mono" title={x.file}>{short(x.file)}</td>
          <td className="r num">{x.page ?? "—"}</td>
          <td className="r"><button className="btn sm outline-accent" disabled={x.queued}
            onClick={() => setOpen({ t: { type: x.type, id: x.id }, seq: true })}>Review</button></td>
        </tr>
      ))}
      {!items.length && <tr><td colSpan={6} className="empty">{data ? "Nothing waiting for this filter. New items appear here as files are processed." : "Loading…"}</td></tr>}
    </tbody></table></div>
    <div className="foot">{items.length} item(s) shown</div>
    {open && <ReviewDialog start={open.t} filter={f} sequence={open.seq} onClose={() => { setOpen(null); load(); }} />}
  </>);
}

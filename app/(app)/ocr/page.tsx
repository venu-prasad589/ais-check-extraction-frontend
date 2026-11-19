"use client";
// OCR (Administrators): read-only log, no review - every page continues to classification.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDT, pct, short } from "@/lib/format";
import { SplitModal } from "@/components/modal";
import { PageViewer } from "@/components/viewer";

interface Row { id: number; page: number; file: string; batch: string; processed_at: string; ocr_conf: number | null; words: number; note: string | null; class: string | null; cls_status: string }

export default function OcrPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  useEffect(() => { api<Row[]>("/api/ocr").then(setRows).catch(() => {}); }, []);
  return (<>
    <div className="page-head"><div><h1>OCR</h1></div></div>
    <div className="table-wrap"><table className="data"><thead><tr>
      <th>Batch</th><th>Processed</th><th>File</th><th className="r">Page</th><th className="r">OCR confidence</th><th className="r">Words</th><th>Note</th><th />
    </tr></thead><tbody>
      {(rows || []).map((p) => (
        <tr key={p.id}><td className="batch-id">{p.batch}</td><td className="num">{fmtDT(p.processed_at)}</td>
          <td className="mono" title={p.file}>{short(p.file)}</td><td className="r num">{p.page}</td>
          <td className="r"><span className={`conf ${p.ocr_conf != null && p.ocr_conf < 0.9 ? "low" : ""}`}>{pct(p.ocr_conf)}</span></td>
          <td className="r num muted">{p.words}</td>
          <td>{p.note ? <span className="muted">{p.note} · continued to classification</span> : <span className="faint">—</span>}</td>
          <td className="r"><button className="btn sm" onClick={() => setOpen(p)}>View</button></td></tr>
      ))}
      {rows && !rows.length && <tr><td colSpan={8} className="empty">No pages processed yet.</td></tr>}
      {!rows && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
    </tbody></table></div>
    <div className="foot">{rows?.length ?? 0} row(s) shown · OCR confidence = mean confidence of the words Nemotron OCR read</div>
    {open && <SplitModal title="OCR result" onClose={() => setOpen(null)}
      sub={<><span className="mono">{open.file}</span> · page {open.page} · batch <span className="mono">{open.batch}</span></>}
      left={<PageViewer pageId={open.id} />}
      right={<>
        <div className="help">OCR results are for information. Every page continues to classification; there is no OCR review.</div>
        <dl className="kv"><dt>OCR confidence</dt><dd><span className={`conf ${open.ocr_conf != null && open.ocr_conf < 0.9 ? "low" : ""}`}>{pct(open.ocr_conf)}</span></dd>
          <dt>Words read</dt><dd>{open.words}</dd><dt>Note</dt><dd>{open.note || "None"}</dd>
          <dt>Classified as</dt><dd>{open.class || <span className="tag review">In Review</span>}</dd></dl>
      </>} />}
  </>);
}

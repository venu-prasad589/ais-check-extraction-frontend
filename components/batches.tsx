"use client";
// Upload Checks > batch history: all uploads (everyone); files in Error with Retry (Administrators only,
// permission matrix). Shown under the upload card; this was the separate Batches tab.
import { useCallback, useEffect, useState } from "react";
import { api, errMsg, post } from "@/lib/api";
import { fmtDT, short } from "@/lib/format";
import type { BatchView, FileRow } from "@/lib/types";
import { useApp } from "@/components/providers";

// Batch status (API routes_files.batch_status) -> how it is shown, and what it means.
const STATUS: Record<string, { cls?: string; color?: string; tip: string }> = {
  "Processing": { color: "var(--accent)", tip: "Files are still being processed" },
  "Needs review": { cls: "p-pending", tip: "Pages or checks are waiting in the Review tab" },
  "Failed": { color: "var(--bad)", tip: "No file of this batch could be processed" },
  "Finished with errors": { color: "var(--bad)", tip: "Some files could not be processed; the rest finished" },
  "Duplicate - not processed": { cls: "p-excluded", tip: "Every file was a duplicate and was not processed" },
  "No checks found": { cls: "p-excluded", tip: "Processed, but no checks were found - nothing to export" },
  "Finished": { cls: "p-auto", tip: "All checks are approved" },
};

function BatchStatus({ s }: { s: string }) {
  const st = STATUS[s] || { tip: s };
  return st.cls ? <span className={`pill ${st.cls}`} title={st.tip}>{s}</span>
    : <span style={{ color: st.color, fontWeight: 500 }} title={st.tip}>{s}</span>;
}

export function BatchHistory({ admin }: { admin: boolean }) {
  const { toast } = useApp();
  const [rows, setRows] = useState<BatchView[] | null>(null);
  const [failed, setFailed] = useState<FileRow[]>([]);
  const load = useCallback(() => {
    api<BatchView[]>("/api/batches").then(setRows).catch(() => {});
    if (admin) api<FileRow[]>("/api/files/failed").then(setFailed).catch(() => {});
  }, [admin]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  const retry = async (f: FileRow) => {
    try { await post(`/api/files/${f.id}/retry`); toast(`${f.name} queued again`); load(); } catch (e) { toast(errMsg(e)); }
  };

  return (<>
    <div className="sec-title"><h2>All batches</h2><span className="muted" style={{ fontSize: 13 }}>Every upload, newest first</span></div>
    <div className="table-wrap"><table className="data"><thead><tr>
      <th>Batch</th><th>Uploaded</th><th>Uploaded by</th><th className="r">Files</th><th className="r">Pages</th><th className="r">Checks</th>
      <th className="r">Auto-approved</th><th className="r">Waiting review</th><th className="r">Errors</th><th className="r">Total time (min)</th><th>Status</th>
    </tr></thead><tbody>
      {(rows || []).map((b) => (
        <tr key={b.id}>
          <td className="mono">{b.id}</td><td className="num">{fmtDT(b.uploaded_at)}</td><td>{b.uploaded_by}</td>
          <td className="r num">{b.files_count}</td><td className="r num">{b.pages}</td><td className="r num">{b.checks}</td>
          <td className="r num">{b.auto}</td>
          <td className="r num">{b.waiting ? <span style={{ color: "var(--warn)", fontWeight: 600 }}>{b.waiting}</span> : 0}</td>
          <td className="r num">{b.errors ? <span style={{ color: "var(--bad)", fontWeight: 600 }}>{b.errors}</span> : 0}</td>
          <td className="r num" title="From upload to the last file processed">{b.status === "Processing" ? <span className="faint">…</span>
            : b.minutes != null ? b.minutes.toFixed(1) : <span className="faint">—</span>}</td>
          <td><BatchStatus s={b.status} /></td>
        </tr>
      ))}
      {rows && !rows.length && <tr><td colSpan={11} className="empty">No batches uploaded yet.</td></tr>}
    </tbody></table></div>
    <div className="foot">{rows?.length ?? 0} batch(es)</div>

    {admin && <>
    <div className="sec-title"><h2>Files in Error</h2><span className="muted" style={{ fontSize: 13 }}>Could not be processed; the rest of their batch went on</span></div>
    <div className="table-wrap"><table className="data"><thead><tr><th>Batch</th><th>File</th><th>When</th><th>Reason</th><th /></tr></thead><tbody>
      {failed.map((f) => (
        <tr key={f.id}><td className="batch-id">{f.batch}</td><td className="mono" title={f.name}>{short(f.name)}</td>
          <td className="num muted">{fmtDT(f.processed_at)}</td><td style={{ whiteSpace: "normal", fontSize: 13 }}>{f.error}</td>
          <td className="r"><button className="btn sm" onClick={() => retry(f)}>Retry</button></td></tr>
      ))}
      {!failed.length && <tr><td colSpan={5} className="empty">No files in Error.</td></tr>}
    </tbody></table></div>
    </>}
  </>);
}

"use client";
// Upload Checks (home): drag in one or many PDFs as a batch; each file shows Split > OCR > Classify > Extract.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { fmtDT, mb, short } from "@/lib/format";
import type { BatchView, FileRow } from "@/lib/types";
import { useApp } from "@/components/providers";

const KEY = "ais-current-batch";
const ORDER = ["split", "ocr", "classify", "extract"] as const;
const LBL = { split: "Split", ocr: "OCR", classify: "Classify", extract: "Extract" };
const RUNNING = ["queued", "split", "ocr", "classify", "extract"];

export default function UploadPage() {
  const { me, toast, refreshCount } = useApp();
  const [batch, setBatch] = useState<BatchView | null>(null);
  const [last, setLast] = useState<BatchView | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    let id: string | null = null;
    try { id = sessionStorage.getItem(KEY); } catch { /* storage blocked */ }
    if (id) {
      try { setBatch(await api<BatchView>(`/api/batches/${id}`)); return; } catch { /* gone */ }
    }
    setBatch(null);
    api<BatchView | null>("/api/batches/latest").then(setLast).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const processing = !!batch?.files?.some((f) => RUNNING.includes(f.stage));
  const stalled = processing && batch?.worker_running === false;   // files wait, nothing processes them here
  useEffect(() => {
    if (!batch || !processing) return;
    const t = setInterval(async () => {
      try { setBatch(await api<BatchView>(`/api/batches/${batch.id}`)); refreshCount(); } catch { /* keep */ }
    }, stalled ? 15000 : 1500);
    return () => clearInterval(t);
  }, [batch, processing, stalled, refreshCount]);

  const addFiles = async (list: File[]) => {
    if (!list.length) return;
    const bad = list.filter((f) => !/\.pdf$/i.test(f.name));
    const ok = list.filter((f) => /\.pdf$/i.test(f.name));
    setRejected(bad.length ? `Only PDF files can be uploaded. Skipped: ${bad.map((f) => f.name).join(", ")}` : null);
    if (!ok.length) return;
    const fd = new FormData();
    ok.forEach((f) => fd.append("files", f, f.name));
    if (batch && processing) fd.append("batch_id", batch.id);
    setUploading(true);
    try {
      const r = await api<{ batch: BatchView | null; accepted: FileRow[]; rejected: { name: string; reason: string }[] }>(
        "/api/uploads", { method: "POST", body: fd });
      if (r.rejected.length) setRejected(r.rejected.map((x) => `${x.name}: ${x.reason}`).join(" · "));
      if (r.batch) {
        setBatch(r.batch);
        try { sessionStorage.setItem(KEY, r.batch.id); } catch { /* storage blocked */ }
        const dups = r.accepted.filter((f) => f.stage === "duplicate").length;
        toast(`${r.accepted.length} file${r.accepted.length > 1 ? "s" : ""} added to batch ${r.batch.id}` +
          (dups ? ` · ${dups} duplicate${dups > 1 ? "s" : ""} sent to Review` : ""));
        refreshCount();
      }
    } catch (e) { setRejected(errMsg(e)); }
    finally { setUploading(false); }
  };

  const files = batch?.files || [];
  const done = batch?.done ?? 0;
  return (<>
    <div className="page-head"><div><h1>Upload Checks</h1></div></div>
    <div className="step-card">
      <h2><span className="step-no">1</span>Check files</h2>
      <div className={`drop ${over ? "over" : ""}`} tabIndex={0} role="button" aria-label="Choose PDF files to upload"
        onClick={() => pick.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); addFiles([...e.dataTransfer.files]); }}>
        <strong>{uploading ? "Uploading…" : "Drag & drop the batch's check PDFs here, or click to browse"}</strong>
        <span className="muted">PDF only · select one or many files (e.g. 15, 20 or 40 at once) · up to 25 MB each</span>
      </div>
      <input ref={pick} type="file" accept=".pdf,application/pdf" multiple hidden
        onChange={(e) => { addFiles([...(e.target.files || [])]); e.target.value = ""; }} />
      {rejected && <div className="rejected">{rejected}</div>}
    </div>

    {batch ? (
      <div className="step-card" style={{ background: "var(--surface)" }}>
        <h2><span className="step-no">2</span>Processing · batch <span className="mono" style={{ fontWeight: 500 }}>{batch.id}</span></h2>
        <div className="batch-head">
          <div className="muted num">{done} of {files.length} files processed{done < files.length ? " · one file at a time, in upload order" : ""}</div>
          <div className="actions">
            {!processing && <button className="btn sm" onClick={() => { try { sessionStorage.removeItem(KEY); } catch { /* */ } load(); }}>Clear</button>}
            {me?.role === "Administrator" && <Link className="btn sm" href="/batches">View all batches</Link>}
          </div>
        </div>
        {stalled && <div className="lockbar" style={{ marginBottom: 12 }}>
          Processing is not running on this server, so these files are waiting in the queue. They are processed when the
          application runs on the GPU server (worker turned on).</div>}
        <div className="progress"><i style={{ width: `${files.length ? Math.round((done / files.length) * 100) : 0}%` }} /></div>
        <div className="table-wrap"><table className="data"><thead><tr>
          <th style={{ width: 48 }}>#</th><th>File</th><th className="r">Size</th><th className="r">Pages</th><th>Pipeline</th><th>Status</th>
        </tr></thead><tbody>
          {files.map((f, i) => <FileRowView key={f.id} f={f} i={i} />)}
        </tbody></table></div>
      </div>
    ) : last && (
      <div className="muted" style={{ fontSize: 13 }}>Last batch: <span className="mono">{last.id}</span> · {last.files_count} files · uploaded {fmtDT(last.uploaded_at)} by {last.uploaded_by}.
        {me?.role === "Administrator" && <> <Link className="link" href="/batches">See all batches</Link></>}</div>
    )}
  </>);
}

function FileRowView({ f, i }: { f: FileRow; i: number }) {
  const st = f.state;
  const idx = f.stage === "queued" || f.stage === "duplicate" || f.stage === "rejected" || f.stage === "error" ? -1
    : f.stage === "done" ? 4 : ORDER.indexOf(f.stage as typeof ORDER[number]);
  const holdIdx = st?.hold === "classify" ? 2 : st?.hold === "extract" ? 3 : -1;
  const status = f.stage === "queued" ? <span className="muted">Pending</span>
    : RUNNING.includes(f.stage) ? <span style={{ color: "var(--accent)", fontWeight: 500 }}>Processing…</span>
      : f.stage === "error" ? <span style={{ color: "var(--bad)", fontWeight: 500 }} title={f.error || ""}>Error</span>
        : st?.kind === "done" ? <span className="pill p-auto">Complete</span>
          : <span className="pill p-pending">{st?.text}</span>;
  return (<>
    <tr className={f.stage === "error" ? "err-row" : ""}>
      <td className="num muted">{i + 1}</td>
      <td className="mono" title={f.name}>{short(f.name)}</td>
      <td className="r num muted">{mb(f.size)}</td>
      <td className="r num">{f.stage === "done" ? f.pages : "—"}</td>
      <td><div className="stages">{ORDER.map((s, j) => {
        let c = j < idx ? "done" : j === idx ? "on" : "";
        if (holdIdx >= 0) c = j < holdIdx ? "done" : j === holdIdx ? "hold" : "";
        return <span key={s} style={{ display: "contents" }}>{j > 0 && <span className="arrow">›</span>}
          <span className={`stg ${c}`}>{c === "done" ? "✓ " : ""}{LBL[s]}</span></span>;
      })}</div></td>
      <td>{status}</td>
    </tr>
    {f.stage === "error" && f.error && <tr><td /><td colSpan={5} style={{ fontSize: 12.5, color: "var(--bad)", paddingTop: 0 }}>{f.error}</td></tr>}
  </>);
}

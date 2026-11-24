"use client";
// Review dialogs (BR-09, BR-10, BR-11, BR-05). One component walks through the Review list:
// it locks the item for 15 minutes when opened, saves the decision, then opens the next item.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, errMsg, post } from "@/lib/api";
import { amountWords, fmtDT, pct } from "@/lib/format";
import { CLASSES, FIELDS, OPTIONAL_FIELDS, type ClsView, type ExtView, type FieldKey, type FileRow, type Lock, type ReviewItem } from "@/lib/types";
import { useApp } from "./providers";
import { SmallModal, SplitModal } from "./modal";
import { PageViewer } from "./viewer";

export type Target = { type: "cls" | "ext" | "dup"; id: number };
type Filter = "all" | "cls" | "ext" | "dup";

const LOCK_URL = { cls: "pages", ext: "extractions", dup: "files" } as const;

/** sequence=true: after each decision the next item of the Review list (filter) opens. */
export function ReviewDialog({ start, filter = "all", sequence = false, onClose }: {
  start: Target; filter?: Filter; sequence?: boolean; onClose: () => void;
}) {
  const { toast, refreshCount } = useApp();
  const [cur, setCur] = useState<Target>(start);
  const held = useRef<Target | null>(null);

  const release = useCallback(() => {
    const h = held.current;
    if (h) post(`/api/${LOCK_URL[h.type]}/${h.id}/unlock`).catch(() => {});
    held.current = null;
  }, []);

  const close = useCallback(() => { release(); refreshCount(); onClose(); }, [release, refreshCount, onClose]);

  // after a decision (or Skip): next item, or close
  const next = useCallback(async (msg?: string, skipped = false) => {
    release();
    refreshCount();
    if (msg) toast(msg);
    if (!sequence) { onClose(); return; }
    try {
      const r = await api<{ items: ReviewItem[] }>(`/api/review?type=${filter}`);
      const q = r.items.filter((i) => !(i.type === cur.type && i.id === cur.id) && !(i.lock && !i.lock.mine) && !i.queued);
      if (q.length) setCur({ type: q[0].type, id: q[0].id });
      else { onClose(); if (!msg || skipped) toast(skipped ? "No other items to review" : "Review list is empty"); else setTimeout(() => toast("Review list is empty"), 1600); }
    } catch (e) { toast(errMsg(e)); onClose(); }
  }, [release, refreshCount, toast, sequence, onClose, filter, cur]);

  const onHeld = useCallback((t: Target) => { held.current = t; }, []);

  useEffect(() => () => { const h = held.current; if (h) post(`/api/${LOCK_URL[h.type]}/${h.id}/unlock`).catch(() => {}); }, []);

  if (cur.type === "cls") return <ClassifyDialog key={"c" + cur.id} id={cur.id} onHeld={onHeld} next={next} close={close} />;
  if (cur.type === "ext") return <ExtractDialog key={"e" + cur.id} id={cur.id} onHeld={onHeld} next={next} close={close} />;
  return <DuplicateDialog key={"d" + cur.id} id={cur.id} onHeld={onHeld} next={next} close={close} />;
}

interface DialogProps { id: number; onHeld: (t: Target) => void; next: (msg?: string, skipped?: boolean) => void; close: () => void }

/** POST lock -> detail. Someone else holding it -> read the detail without the lock. */
function useLocked<T extends { lock?: Lock | null }>(lockUrl: string, getUrl: string, type: Target["type"], id: number, onHeld: DialogProps["onHeld"]) {
  const [data, setData] = useState<T | null>(null);
  const [lockMsg, setLockMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const d = await post<T>(lockUrl);
      if (d.lock?.mine) onHeld({ type, id });
      setData(d);
    } catch (e) {
      if (e instanceof ApiError && e.status === 423) {
        setLockMsg(e.message);
        try { setData(await api<T>(getUrl)); } catch (e2) { setError(errMsg(e2)); }
      } else setError(errMsg(e));
    }
  }, [lockUrl, getUrl, type, id, onHeld]);
  useEffect(() => { load(); }, [load]);
  return { data, setData, lockMsg, error, reload: load };
}

const sub = (d: { file: string; page: number | null; batch: string }) => (
  <><span className="mono">{d.file}</span>{d.page != null && <> · page {d.page}</>} · batch <span className="mono">{d.batch}</span></>
);

// ---------------------------------------------------------------------------
// classification
// ---------------------------------------------------------------------------
function ClassifyDialog({ id, onHeld, next, close }: DialogProps) {
  const { data: p, lockMsg, error } = useLocked<ClsView>(`/api/pages/${id}/lock`, `/api/pages/${id}`, "cls", id, onHeld);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  if (error) return <SplitModal title="Classify Page" sub="" left={null} right={<div className="err">{error}</div>} onClose={close} />;
  if (!p) return <SplitModal title="Classify Page" sub="Loading…" left={<div className="loading"><span className="spin" /></div>} right={null} onClose={close} />;
  const pending = p.status === "pending";
  const canDecide = pending && !lockMsg;
  const choose = async (label: string) => {
    setBusy(true);
    try { const r = await post<{ message: string }>(`/api/pages/${id}/classify`, { label }); next(r.message); }
    catch (e) { toast(errMsg(e)); setBusy(false); }
  };
  return (
    <SplitModal title={pending ? "Classify Page" : "Classification"} sub={sub(p)} onClose={close}
      left={<PageViewer pageId={p.id} />}
      right={<>
        {lockMsg && <div className="lockbar">{lockMsg}</div>}
        <div className="help">{pending
          ? "Choose what this page is. This completes the review. A check front then goes on to extraction; non-checks and backs of checks are kept for the record only."
          : "Class assigned to this page."}</div>
        {p.note && <div className="infobar">{p.note}</div>}
        {CLASSES.map((c) => {
          const chosen = !pending && p.label === c;
          return (
            <button key={c} className="choice" disabled={!canDecide || busy} onClick={() => choose(c)}
              style={chosen ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : undefined}>
              <span><strong>{c}</strong>
                {pending && c === p.guess && <span className="best">Model&apos;s best guess</span>}
                {chosen && <span className="best">{p.status === "manual" ? `Chosen by ${p.by}` : "Auto-approved"}</span>}
              </span>
              <span className="conf">{pct(p.scores[c])}</span>
            </button>
          );
        })}
        {CLASSES.some((c) => p.scores[c] == null) && p.conf != null &&
          <div className="faint" style={{ fontSize: 12 }}>This page was classified before the classifier gave front and back separately.</div>}
        {pending && <div className="decide-foot"><button className="btn" onClick={() => next(undefined, true)}>Skip for now</button></div>}
      </>} />
  );
}

// ---------------------------------------------------------------------------
// extraction
// ---------------------------------------------------------------------------
function ExtractDialog({ id, onHeld, next, close }: DialogProps) {
  const { data: e, setData, lockMsg, error } = useLocked<ExtView>(`/api/extractions/${id}/lock`, `/api/extractions/${id}`, "ext", id, onHeld);
  const [vals, setVals] = useState<Record<FieldKey, string>>({ payor: "", address: "", pay_to: "", check_no: "", check_date: "", amount: "" });
  const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();

  useEffect(() => {
    if (e) setVals(Object.fromEntries(FIELDS.map(([k]) => [k, e.values[k] ?? ""])) as Record<FieldKey, string>);
  }, [e]);

  // a page sent to Granite after classification: wait for the result
  useEffect(() => {
    if (!e || e.status !== "queued") return;
    const t = setInterval(async () => {
      try { const d = await api<ExtView>(`/api/extractions/${id}`); if (d.status !== "queued") setData(await post<ExtView>(`/api/extractions/${id}/lock`)); }
      catch { /* keep waiting */ }
    }, 3000);
    return () => clearInterval(t);
  }, [e, id, setData]);

  if (error) return <SplitModal title="Review Check" sub="" left={null} right={<div className="err">{error}</div>} onClose={close} />;
  if (!e) return <SplitModal title="Review Check" sub="Loading…" left={<div className="loading"><span className="spin" /></div>} right={null} onClose={close} />;

  const pending = e.status === "pending";
  const canEdit = pending && !lockMsg;
  const low = pending ? e.low_fields : [];
  const boxes = low.map((k) => e.boxes?.[k]).filter(Boolean) as [number, number, number, number][];

  const approve = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // Payor Address is optional (left empty it is saved as NULL); the other fields are required.
    const missing = FIELDS.filter(([k]) => !OPTIONAL_FIELDS.includes(k) && !vals[k].trim()).map(([, l]) => l);
    if (missing.length) { setErrs([`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`]); return; }
    setBusy(true);
    setErrs([]);
    try { const r = await post<{ message: string }>(`/api/extractions/${id}/approve`, { values: vals }); next(r.message); }
    catch (x) { if (x instanceof ApiError && x.errors.length) setErrs(x.errors); else toast(errMsg(x)); setBusy(false); }
  };
  const notCheck = async () => {
    setBusy(true);
    try { const r = await post<{ message: string }>(`/api/extractions/${id}/not-check`); next(r.message); }
    catch (x) { toast(errMsg(x)); setBusy(false); }
  };

  const title = e.status === "queued" ? "Reading check…" : pending ? `Review Check #${e.values.check_no ?? ""}` : `Check #${e.values.check_no ?? ""}`;
  return (
    <SplitModal title={title} sub={sub(e)} onClose={close}
      left={<PageViewer pageId={e.id} boxes={boxes} size={e.image} />}
      right={e.status === "queued" ? (
        <div className="infobar"><span className="spin" /> {e.reprocess === "queued" || e.reprocess === "running"
          ? "No MICR line was found on this check, so the page is being processed again from step 1 (OCR, classification, extraction). The fields appear here when it is done."
          : "Granite Vision is reading this check. The fields appear here when it is done."}
          <div style={{ marginTop: 10 }}><button className="btn sm" onClick={() => next(undefined, true)}>Skip for now</button></div></div>
      ) : (<>
        {lockMsg && <div className="lockbar">{lockMsg}</div>}
        <div className="help">{pending
          ? <>Edit any field below, then click <strong>Approve</strong>. Outlined areas on the check are the fields the model was not sure about.</>
          : e.status === "manual" ? `Approved by ${e.reviewed_by}${e.reviewed_at ? " · " + fmtDT(e.reviewed_at) : ""}.` : "Auto-approved: all required fields at or above the confidence threshold."}</div>
        {e.notes._general && <div className="lockbar">{e.notes._general}</div>}
        <form onSubmit={approve} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FIELDS.map(([k, label]) => {
            const isLow = low.includes(k);
            const corr = e.corrections?.filter((c) => c.field === k).at(-1);
            return (
              <div key={k}>
                <div className="flab"><label htmlFor={"f_" + k}>{label}{OPTIONAL_FIELDS.includes(k) ? <span className="muted" style={{ fontWeight: 400 }}> (optional)</span> : " *"}</label><span className={`conf ${isLow ? "low" : ""}`}>{pct(e.conf[k] ?? 0)}</span></div>
                <input id={"f_" + k} className={`input ${isLow ? "low" : ""}`} value={vals[k]} readOnly={!canEdit}
                  onChange={(x) => setVals((v) => ({ ...v, [k]: x.target.value }))} />
                {isLow && e.notes[k] && <div className="notes">{e.notes[k]}</div>}
                {isLow && k === "amount" && vals.amount && <div className="hint">Compare with the written amount: “{amountWords(vals.amount)}”</div>}
                {!pending && corr && <div className="orig">Extracted: {corr.from || "—"} · changed by {corr.by}</div>}
              </div>
            );
          })}
          {errs.length > 0 && <div className="err">{errs.map((x) => <div key={x}>{x}</div>)}</div>}
          {pending && (
            <div className="decide-foot">
              <button className="btn primary" type="submit" disabled={!canEdit || busy}>Approve</button>
              <button className="btn" type="button" onClick={() => next(undefined, true)}>Skip for now</button>
              <button className="btn danger" type="button" disabled={!canEdit || busy} onClick={notCheck}>Not a check</button>
            </div>
          )}
        </form>
      </>)} />
  );
}

// ---------------------------------------------------------------------------
// duplicate file (BR-05)
// ---------------------------------------------------------------------------
function DuplicateDialog({ id, onHeld, next, close }: DialogProps) {
  const { data: f, lockMsg, error } = useLocked<FileRow & { original: FileRow | null; lock?: Lock | null }>(
    `/api/files/${id}/lock`, `/api/files/${id}`, "dup", id, onHeld);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  const decide = async (decision: "process" | "reject") => {
    setBusy(true);
    try { const r = await post<{ message: string }>(`/api/files/${id}/duplicate`, { decision }); next(r.message); }
    catch (x) { toast(errMsg(x)); setBusy(false); }
  };
  return (
    <SmallModal title="Duplicate file" sub={f ? <span className="mono">{f.name}</span> : "Loading…"} onClose={close}>
      {error && <div className="err">{error}</div>}
      {lockMsg && <div className="lockbar">{lockMsg}</div>}
      {f && <>
        <div className="help">This file is exactly the same as a file that was already uploaded, so it was not processed.
          Process it again from step 1 only if that is intended.</div>
        <dl className="kv">
          <dt>This upload</dt><dd>batch <span className="mono">{f.batch}</span> · {fmtDT(f.uploaded_at)}</dd>
          <dt>Same as</dt><dd>{f.original ? <><span className="mono">{f.original.name}</span><br />batch <span className="mono">{f.original.batch}</span> · {fmtDT(f.original.uploaded_at)} · {f.original.stage === "done" ? "processed" : f.original.stage}</> : "—"}</dd>
        </dl>
        {f.stage === "duplicate" && (
          <div className="actions" style={{ justifyContent: "flex-end" }}>
            <button className="btn" onClick={() => next(undefined, true)}>Skip for now</button>
            <button className="btn danger" disabled={busy || !!lockMsg} onClick={() => decide("reject")}>Do not process</button>
            <button className="btn primary" disabled={busy || !!lockMsg} onClick={() => decide("process")}>Process anyway</button>
          </div>
        )}
      </>}
    </SmallModal>
  );
}

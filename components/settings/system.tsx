"use client";
// Settings > System: confidence threshold (BR-06), upload limit, retention, processing worker status.
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useApp } from "@/components/providers";

interface Settings { confidence_threshold: string; max_upload_mb: string; retention_days: string; worker: { enabled: boolean; running: boolean } }

export function SystemSection() {
  const { toast } = useApp();
  const [s, setS] = useState<Settings | null>(null);
  const [v, setV] = useState({ thr: "", mb: "", days: "" });
  useEffect(() => {
    api<Settings>("/api/admin/settings").then((x) => { setS(x); setV({ thr: String(Math.round(+x.confidence_threshold * 100)), mb: x.max_upload_mb, days: x.retention_days }); }).catch(() => {});
  }, []);
  const save = async () => {
    try {
      const x = await api<Settings>("/api/admin/settings", { method: "PUT", json: { confidence_threshold: +v.thr / 100, max_upload_mb: +v.mb, retention_days: +v.days } });
      setS(x);
      toast("Settings saved");
    } catch (e) { toast(errMsg(e)); }
  };
  if (!s) return null;
  return (
    <div className="panel"><div className="panel-head"><h2>System settings</h2></div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="settings-grid">
          <div className="field" style={{ margin: 0 }}><label htmlFor="thr">Confidence threshold (%)</label>
            <input className="input" id="thr" type="number" min={50} max={100} value={v.thr} onChange={(e) => setV({ ...v, thr: e.target.value })} />
            <span className="faint" style={{ fontSize: 12 }}>Classification and extraction below this go to Review (BR-06). Applies to files processed after saving.</span></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="mb">Upload limit per file (MB)</label>
            <input className="input" id="mb" type="number" min={1} max={200} value={v.mb} onChange={(e) => setV({ ...v, mb: e.target.value })} /></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="days">Retention (days)</label>
            <input className="input" id="days" type="number" min={30} max={3650} value={v.days} onChange={(e) => setV({ ...v, days: e.target.value })} />
            <span className="faint" style={{ fontSize: 12 }}>Saved only; nothing is deleted automatically yet.</span></div>
        </div>
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 13 }}>Processing worker: {s.worker.enabled ? (s.worker.running ? "running" : "stopped") : "turned off on this server"}</span>
          <button className="btn primary" onClick={save}>Save settings</button>
        </div>
      </div>
    </div>
  );
}

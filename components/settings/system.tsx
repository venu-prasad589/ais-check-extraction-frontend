"use client";
// Settings > System: confidence thresholds for classification and extraction (BR-06), upload limit,
// retention, processing worker status.
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useApp } from "@/components/providers";

interface Settings { cls_threshold: string; ext_threshold: string; max_upload_mb: string; retention_days: string; worker: { enabled: boolean; running: boolean } }

const toPct = (x: string) => String(Math.round(+x * 100));

export function SystemSection() {
  const { toast } = useApp();
  const [s, setS] = useState<Settings | null>(null);
  const [v, setV] = useState({ cls: "", ext: "", mb: "", days: "" });
  useEffect(() => {
    api<Settings>("/api/admin/settings").then((x) => { setS(x); setV({ cls: toPct(x.cls_threshold), ext: toPct(x.ext_threshold), mb: x.max_upload_mb, days: x.retention_days }); }).catch(() => {});
  }, []);
  const save = async () => {
    try {
      const x = await api<Settings>("/api/admin/settings", { method: "PUT", json: { cls_threshold: +v.cls / 100, ext_threshold: +v.ext / 100, max_upload_mb: +v.mb, retention_days: +v.days } });
      setS(x);
      toast("Settings saved");
    } catch (e) { toast(errMsg(e)); }
  };
  if (!s) return null;
  return (
    <div className="panel"><div className="panel-head"><h2>System settings</h2></div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="settings-grid">
          <div className="field" style={{ margin: 0 }}><label htmlFor="thrCls">Confidence threshold for Classification (%)</label>
            <input className="input" id="thrCls" type="number" min={50} max={100} value={v.cls} onChange={(e) => setV({ ...v, cls: e.target.value })} />
            <span className="faint" style={{ fontSize: 12 }}>Pages classified at or above this are auto-approved; below it they go to Review. Applies to files processed after saving.</span></div>
          <div className="field" style={{ margin: 0 }}><label htmlFor="thrExt">Confidence threshold for Extraction (%)</label>
            <input className="input" id="thrExt" type="number" min={50} max={100} value={v.ext} onChange={(e) => setV({ ...v, ext: e.target.value })} />
            <span className="faint" style={{ fontSize: 12 }}>A check is auto-approved only when every extracted field is at or above this; otherwise it goes to Review. Applies to files processed after saving.</span></div>
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

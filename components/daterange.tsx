"use client";
// From / To date-range picker of the mockup (BR-12): click the start day, then the end day
// (the same day twice for a single day). Future days are disabled. Default is today.
import { useEffect, useRef, useState } from "react";
import { fmtNice, todayKey, todayRange, type Range } from "@/lib/format";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DateRange({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | null>(value.from);
  const [to, setTo] = useState<string | null>(value.to);
  const [phase, setPhase] = useState<"from" | "to" | "">("");
  const [view, setView] = useState(() => { const [y, m] = value.to.split("-").map(Number); return { y, m: m - 1 }; });
  const root = useRef<HTMLDivElement>(null);
  const tk = todayKey();
  const [ty, tm] = tk.split("-").map(Number);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false); setFrom(value.from); setTo(value.to); setPhase("");
      }
    };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open, value]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    setFrom(value.from); setTo(value.to); setPhase("from");
    const [y, m] = value.to.split("-").map(Number); setView({ y, m: m - 1 }); setOpen(true);
  };
  const pick = (k: string) => {
    if (phase === "from") { setFrom(k); setTo(null); setPhase("to"); return; }
    if (from && k < from) { setFrom(k); return; }
    setTo(k); setPhase(""); setOpen(false); onChange({ from: from!, to: k });
  };
  const step = (d: number) => setView((v) => { let m = v.m + d, y = v.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; });

  const first = new Date(view.y, view.m, 1).getDay();
  const n = new Date(view.y, view.m + 1, 0).getDate();
  const atMax = view.y * 12 + view.m >= ty * 12 + (tm - 1);
  const shownFrom = open ? from : value.from, shownTo = open ? to : value.to;

  return (
    <div className="dr" ref={root}>
      <button type="button" className="dr-box" aria-label="Choose date range" onClick={toggle}>
        <span className={`dr-half ${open && phase === "from" ? "on" : ""}`}><small>From</small><b>{shownFrom ? fmtNice(shownFrom) : "Add date"}</b></span>
        <span className="dr-sep" />
        <span className={`dr-half ${open && phase === "to" ? "on" : ""}`}><small>To</small><b>{shownTo ? fmtNice(shownTo) : "Add date"}</b></span>
      </button>
      {open && (
        <div className="dr-pop">
          <div className="dr-head">
            <button type="button" className="dr-nav" onClick={() => step(-1)} aria-label="Previous month">‹</button>
            <b>{MONTHS[view.m]} {view.y}</b>
            <button type="button" className="dr-nav" onClick={() => step(1)} disabled={atMax} aria-label="Next month">›</button>
          </div>
          <div className="dr-grid">
            {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => <span key={i} className="dr-wd">{w}</span>)}
            {Array.from({ length: first }, (_, i) => <span key={"e" + i} />)}
            {Array.from({ length: n }, (_, i) => {
              const d = i + 1;
              const k = `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const edge = k === from || k === to, mid = !!(from && to && k > from && k < to);
              const ranged = !!(from && to && from !== to);
              return (
                <span key={k} className={`dr-cell ${mid ? "mid" : ""} ${ranged && k === from ? "start" : ""} ${ranged && k === to ? "end" : ""}`}>
                  <button type="button" className={`${edge ? "sel" : ""} ${k === tk ? "today" : ""}`} disabled={k > tk} onClick={() => pick(k)}>{d}</button>
                </span>
              );
            })}
          </div>
          <div className="dr-foot">
            <span className="muted">{phase === "from" ? "Select the start date" : "Select the end date (same day for one day)"}</span>
            <button type="button" className="link" onClick={() => { setOpen(false); setPhase(""); onChange(todayRange()); }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect } from "react";

/** Split modal of the mockup: document on the left, decision on the right. */
export function SplitModal({ title, sub, left, right, onClose }: {
  title: React.ReactNode; sub: React.ReactNode; left: React.ReactNode; right: React.ReactNode; onClose: () => void;
}) {
  useEsc(onClose);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={typeof title === "string" ? title : "Review"}>
        <div className="modal-head">
          <div><h2>{title}</h2><div className="sub">{sub}</div></div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="viewer">{left}</div>
          <div className="decide">{right}</div>
        </div>
      </div>
    </div>
  );
}

/** Small single-column modal (export, users, passwords). */
export function SmallModal({ title, sub, width = 560, onClose, children, overflowVisible }: {
  title: string; sub?: React.ReactNode; width?: number; onClose: () => void; children: React.ReactNode; overflowVisible?: boolean;
}) {
  useEsc(onClose);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: `min(${width}px,100%)`, overflow: overflowVisible ? "visible" : undefined }} role="dialog" aria-label={title}>
        <div className="modal-head">
          <div><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</div>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflow: overflowVisible ? "visible" : "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
}

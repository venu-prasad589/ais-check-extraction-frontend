"use client";
// Page image for the review screens: the real page from the pipeline (MICR line already blacked
// out by the API, BR-15), uncertain fields outlined, rotate buttons as in the mockup.
import { useState } from "react";

type Box = [number, number, number, number];

export function PageViewer({ pageId, boxes, size }: {
  pageId: number; boxes?: Box[]; size?: { w: number | null; h: number | null };
}) {
  const [rot, setRot] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const w = size?.w || 0, h = size?.h || 0;
  return (
    <>
      <div className="page-img-wrap" style={{ transform: `rotate(${rot}deg)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/pages/${pageId}/image`} alt="Page image" onLoad={() => setState("ok")} onError={() => setState("error")}
          style={{ display: state === "error" ? "none" : "block" }} />
        {state === "ok" && w > 0 && h > 0 && (boxes || []).map((b, i) => (
          <span key={i} className="hl" style={{ left: `${(b[0] / w) * 100}%`, top: `${(b[1] / h) * 100}%`,
            width: `${((b[2] - b[0]) / w) * 100}%`, height: `${((b[3] - b[1]) / h) * 100}%` }} />
        ))}
      </div>
      {state === "loading" && <div className="loading"><span className="spin" /> Loading page…</div>}
      {state === "error" && <div className="loading">The page image is not available.</div>}
      <div className="tools">
        <button onClick={() => setRot((r) => r - 90)}>⟲ Rotate</button>
        <button onClick={() => setRot((r) => r + 90)}>⟳ Rotate</button>
      </div>
    </>
  );
}

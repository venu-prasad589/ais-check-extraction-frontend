"use client";
import { fmtDT, pct, short } from "@/lib/format";
import type { ClsView } from "@/lib/types";
import { QueueView } from "@/components/queue";

export default function ClassificationPage() {
  return (
    <QueueView<ClsView> title="Classification" url="/api/classification" type="cls"
      pendingTxt={(n) => `${n} page(s) waiting in Review for a class`}
      cols={["Batch", "Processed", "File", ">Page", "Class", ">Confidence", "Status"]}
      row={(p) => (<>
        <td className="batch-id">{p.batch}</td><td className="num">{fmtDT(p.processed_at)}</td>
        <td className="mono" title={p.file}>{short(p.file)}</td><td className="r num">{p.page}</td>
        <td>{p.label ? <span className={`tag ${p.label === "Check (front)" ? "" : p.label === "Back of check" ? "back" : "grey"}`}>{p.label}</span>
          : <span className="tag review">Review</span>}</td>
        <td className="r"><span className={`conf ${p.status === "pending" ? "low" : ""}`}>{pct(p.conf)}</span></td>
        <td><span className={`pill p-${p.status}`}>{{ auto: "Auto", pending: "Pending", manual: "Manual" }[p.status]}</span></td>
      </>)} />
  );
}

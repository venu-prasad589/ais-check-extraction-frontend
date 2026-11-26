"use client";
import { fmtDT, pct, short, usd } from "@/lib/format";
import type { ExtView } from "@/lib/types";
import { QueueView } from "@/components/queue";

export default function ExtractionPage() {
  return (
    <QueueView<ExtView> title="Extraction" url="/api/extraction" type="ext" results
      pendingTxt={(n) => `${n} check(s) waiting in Review`}
      cols={["Batch", "Processed", "File", "Payor", "Check #", ">Amount", ">Confidence", "Status"]}
      row={(e) => {
        const st = e.status === "queued" ? "pending" : e.status;
        return (<>
          <td className="batch-id">{e.batch}</td><td className="num">{fmtDT(e.processed_at)}</td>
          <td className="mono" title={e.file}>{short(e.file)}</td><td>{e.values.payor}</td>
          <td className="num">{e.values.check_no}</td><td className="r num">{usd(e.values.amount)}</td>
          <td className="r"><span className={`conf ${st === "pending" ? "low" : ""}`}>{pct(e.min_conf)}</span></td>
          <td><span className={`pill p-${st}`}>{{ auto: "Auto", pending: "Pending", manual: "Manual", error: "Error" }[st]}</span></td>
        </>);
      }} />
  );
}

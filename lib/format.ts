// Formatting helpers (same output as the mockup).

export const pct = (v: number | null | undefined) => (v == null ? "—" : Math.round(v * 100) + "%");

export const money = (v: string | number | null | undefined) => {
  const n = Number(v);
  return v == null || v === "" || isNaN(n) ? String(v ?? "") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Business time zone: the date a file was processed in Dallas decides which day a check belongs to
// (scope, "Processed At"). Times and "today" are shown in that zone for every user, wherever they are.
export const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/Chicago";

/** "11/16/2026 9:05 AM" in the business time zone. */
export const fmtDT = (iso: string | null | undefined) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { timeZone: TZ, month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(",", "");
};

/** "11/16/2026" (date only) in the business time zone. */
export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, month: "numeric", day: "numeric", year: "numeric" }) : "";

/** Today's date in the business time zone, YYYY-MM-DD. */
export const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fmtD = (k: string) => {
  const [y, m, d] = k.split("-");
  return `${+m}/${+d}/${y}`;
};

/** Check date as printed in Results: "2026-10-06" -> "10/06/2026" (MM/DD/YYYY). Plain text conversion - no time
 *  zone, so the day never shifts. Anything that is not YYYY-MM-DD is shown as it is. */
export const fmtCheckDate = (v: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "");
  return m ? `${m[2]}/${m[3]}/${m[1]}` : v ?? "";
};

const MON3 =["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtNice = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return `${MON3[m - 1]} ${d}, ${y}`;
};

export interface Range { from: string; to: string }
export const todayRange = (): Range => ({ from: todayKey(), to: todayKey() });
export const rLabel = (r: Range) => (r.from === r.to ? fmtD(r.from) : `${fmtD(r.from)} – ${fmtD(r.to)}`);

export const short = (n: string) => (n.length > 38 ? n.slice(0, 16) + "…" + n.slice(-18) : n);

export const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + " MB";

export function amountWords(v: string | null) {
  const n0 = Number(v);
  if (v == null || isNaN(n0)) return "";
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const w = (n: number): string =>
    n < 20 ? ones[n] : n < 100 ? tens[Math.floor(n / 10)] + (n % 10 ? "-" + ones[n % 10] : "")
      : n < 1000 ? ones[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + w(n % 100) : "")
        : n < 1e6 ? w(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + w(n % 1000) : "")
          : w(Math.floor(n / 1e6)) + " million" + (n % 1e6 ? " " + w(n % 1e6) : "");
  const [d, c] = n0.toFixed(2).split(".");
  const s = w(+d) || "zero";
  return s.charAt(0).toUpperCase() + s.slice(1) + " and " + c + "/100";
}

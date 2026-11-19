// Calls to the FastAPI backend. Next.js forwards /api/* to it (next.config.ts), so the session
// cookie is sent automatically and never handled by JavaScript.

export class ApiError extends Error {
  status: number;
  errors: string[];
  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  let errors: string[] = [];
  try {
    const body = await res.json();
    const d = body?.detail;
    if (typeof d === "string") message = d;
    else if (d?.errors) {
      errors = d.errors;
      message = errors.join(" ");
    } else if (Array.isArray(d)) message = d.map((x: { msg?: string }) => x.msg).join(" ");
  } catch {
    /* not JSON */
  }
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
    location.href = "/login";
  }
  return new ApiError(res.status, message, errors);
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    credentials: "same-origin",
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers || {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const post = <T = unknown>(path: string, json?: unknown) => api<T>(path, { method: "POST", json: json ?? {} });

/** Downloads a file from the API (Export Excel). Returns the file name and row count. */
export async function download(path: string): Promise<{ name: string; rows: number }> {
  const res = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw await parseError(res);
  const cd = res.headers.get("Content-Disposition") || "";
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] || "export.xlsx";
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return { name, rows: Number(res.headers.get("X-Rows") || 0) };
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

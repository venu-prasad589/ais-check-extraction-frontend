"use client";
// Signed-in user, review counter and toasts, shared by every screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";

interface Ctx {
  me: Me | null;
  setMe: (m: Me | null) => void;
  loading: boolean;
  reviewCount: number;
  refreshCount: () => void;
  toast: (msg: string) => void;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function Providers({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);

  const refreshCount = useCallback(() => {
    api<{ all: number }>("/api/review/counts").then((c) => setReviewCount(c.all)).catch(() => {});
  }, []);

  useEffect(() => {
    api<Me>("/api/auth/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me || me.must_change_password) return;
    refreshCount();
    const t = setInterval(refreshCount, 8000);
    return () => clearInterval(t);
  }, [me, refreshCount]);

  return (
    <AppCtx.Provider value={{ me, setMe, loading, reviewCount, refreshCount, toast }}>
      {children}
      <div className="toast" hidden={!msg} role="status">{msg}</div>
    </AppCtx.Provider>
  );
}

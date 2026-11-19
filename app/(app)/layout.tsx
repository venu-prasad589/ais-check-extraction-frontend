"use client";
// Top bar with the work-queue tabs. BR-02: a Reviewer sees Upload Checks, Review, Results and
// Dashboard only. The API checks the role again on every request, so hiding a tab is not the
// only protection.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { Role } from "@/lib/types";
import { useApp } from "@/components/providers";

const TABS:{ href: string; label: string; roles: Role[] }[] = [
  { href: "/upload", label: "Upload Checks", roles: ["Reviewer", "Administrator"] },   // + batch history for Administrators
  { href: "/review", label: "Review", roles: ["Reviewer", "Administrator"] },
  { href: "/ocr", label: "OCR", roles: ["Administrator"] },
  { href: "/classification", label: "Classification", roles: ["Administrator"] },
  { href: "/extraction", label: "Extraction", roles: ["Administrator"] },
  { href: "/results", label: "Results", roles: ["Reviewer", "Administrator"] },
  { href: "/dashboard", label: "Dashboard", roles: ["Reviewer", "Administrator"] },
  { href: "/settings", label: "Settings", roles: ["Administrator"] },   // System Admin + Developer Portal
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, setMe, loading, reviewCount } = useApp();
  const path = usePathname();
  const router = useRouter();
  const tab = TABS.find((t) => path.startsWith(t.href));
  const allowed = !!me && (!tab || tab.roles.includes(me.role));

  useEffect(() => {
    if (loading) return;
    if (!me || me.must_change_password) router.replace("/login");
    else if (!allowed) router.replace("/upload");
  }, [me, loading, allowed, router]);

  if (loading || !me || me.must_change_password || !allowed) return null;

  const signOut = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setMe(null);
    try { sessionStorage.removeItem("ais-current-batch"); } catch { /* storage blocked */ }
    router.replace("/login");
  };

  return (
    <div id="app">
      <header className="topbar"><div className="topbar-inner">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/ais-logo.png" alt="AIS" />
          <div className="brand-name">AIS IDP<span>Check Extraction</span></div>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.filter((t) => t.roles.includes(me.role)).map((t) => (
            <Link key={t.href} href={t.href} className="tab" role="tab" aria-selected={tab?.href === t.href}>
              {t.label}
              {t.href === "/review" && <span className="count" data-zero={reviewCount === 0}>{reviewCount}</span>}
            </Link>
          ))}
        </nav>
        <div className="me">
          <span className="who"><strong>{me.name}</strong> <span className="muted" id="meRole">· {me.role}</span></span>
          <button className="btn sm" onClick={signOut}>Sign out</button>
        </div>
      </div></header>
      <main>{children}</main>
    </div>
  );
}

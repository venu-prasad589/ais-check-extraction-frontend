"use client";
// Settings (Administrators): System Admin and Developer Portal in one tab, as three sections -
// Users (BR-14, BR-16), System settings (BR-06 threshold, upload limit, retention) and Developer Portal (prompts).
// The open section is kept in the address (?tab=users|system|developer) so a link or refresh opens the same one.
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UsersSection } from "@/components/settings/users";
import { SystemSection } from "@/components/settings/system";
import { DeveloperSection } from "@/components/settings/developer";

const SECTIONS = [
  { key: "users", label: "Users" },
  { key: "system", label: "System settings" },
  { key: "developer", label: "Developer Portal" },
] as const;
type Key = typeof SECTIONS[number]["key"];

export default function SettingsPage() {
  return <Suspense fallback={null}><Settings /></Suspense>;
}

function Settings() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const asked = params.get("tab");
  const tab: Key = SECTIONS.some((s) => s.key === asked) ? (asked as Key) : "users";

  return (<>
    <div className="page-head"><div><h1>Settings</h1></div></div>
    <nav className="subtabs" role="tablist" aria-label="Settings sections">
      {SECTIONS.map((s) => (
        <button key={s.key} className="subtab" role="tab" aria-selected={tab === s.key}
          onClick={() => router.replace(`${path}?tab=${s.key}`, { scroll: false })}>{s.label}</button>
      ))}
    </nav>
    {tab === "users" && <UsersSection />}
    {tab === "system" && <SystemSection />}
    {tab === "developer" && <DeveloperSection />}
  </>);
}

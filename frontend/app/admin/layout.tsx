"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  Landmark, LogOut, Search, Bell, User as UserIcon,
  LayoutDashboard, Users, ShieldAlert, PieChart, MapPin,
  FileText, PlaySquare, FileCheck, Layers, Inbox,
  KeyRound, ClipboardCheck,
} from "lucide-react";
import { api, type AnalyticsSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AdminChatbot } from "@/components/AdminChatbot";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/gaps", label: "Missing Beneficiaries", icon: Users },
  { href: "/admin/gaps?label=Conflict Detected", label: "Fraud & Anomalies", icon: ShieldAlert },
  { href: "/admin/analytics", label: "Scheme Coverage", icon: PieChart },
  { href: "/admin/analytics?view=map", label: "Village Heatmap", icon: MapPin },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/applications", label: "Review Applications", icon: Layers },
  { href: "/admin/grievances", label: "Grievances", icon: Inbox },
  { href: "/admin/demo", label: "Demo Walkthrough", icon: PlaySquare },
  { href: "/admin/logs", label: "Audit Logs", icon: FileCheck },
  { href: "/admin/security", label: "Security (MFA)", icon: KeyRound },
  { href: "/admin/compliance", label: "Compliance", icon: ClipboardCheck },
];

/** Query-aware active matching: a `?key=value` link is active only when the
 *  current query matches exactly; a plain link yields to a same-base
 *  query-link that is active (so only ONE item highlights at a time). */
function activeBases(pathname: string, search: string): { queryBases: Set<string> } {
  const queryBases = new Set<string>();
  for (const l of links) {
    const q = l.href.indexOf("?");
    if (q === -1) continue;
    const base = l.href.slice(0, q);
    if (pathname !== base) continue;
    const want = new URLSearchParams(l.href.slice(q + 1)).toString();
    if (search === want) queryBases.add(base);
  }
  return { queryBases };
}

function isLinkActive(
  href: string, pathname: string, search: string, queryBases: Set<string>,
): boolean {
  const q = href.indexOf("?");
  if (q !== -1) {
    if (pathname !== href.slice(0, q)) return false;
    return search === new URLSearchParams(href.slice(q + 1)).toString();
  }
  if (href === "/admin/dashboard") return pathname === href;
  const matches = pathname === href || pathname.startsWith(href + "/");
  return matches && !queryBases.has(href);
}

function SidebarLinks({ pathname, variant }: { pathname: string; variant: "desktop" | "mobile" }) {
  const search = useSearchParams().toString();
  const { admin } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  // Same cached summary the top bar already fetches (cacheKey analytics:token)
  // — no extra network request, badges stay live.
  useEffect(() => {
    if (!admin.token) return;
    api.analyticsSummary(admin.token).then(setSummary).catch(() => undefined);
  }, [admin.token, pathname]);
  const { queryBases } = activeBases(pathname, search);
  const counts: Record<string, number> = {
    "Missing Beneficiaries": summary?.open ?? 0,
    "Fraud & Anomalies": summary?.high_priority ?? 0,
  };
  const badgeCls =
    variant === "desktop"
      ? "ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white"
      : "ml-auto rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white";
  return (
    <>
      {links.map((l) => {
        const Icon = l.icon;
        const active = isLinkActive(l.href, pathname, search, queryBases);
        const count = counts[l.label] ?? 0;
        return variant === "desktop" ? (
          <Link
            key={l.label}
            href={l.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold transition-all",
              active ? "bg-blue-700 text-white shadow-md" : "hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon size={16} />
            <span>{l.label}</span>
            {count > 0 && <span className={badgeCls}>{count}</span>}
          </Link>
        ) : (
          <Link
            key={l.label}
            href={l.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap",
              active ? "bg-blue-700 text-white" : "text-slate-300 hover:bg-white/10",
            )}
          >
            <Icon size={13} /> {l.label}
            {count > 0 && <span className={badgeCls}>{count}</span>}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, adminLogout, ready } = useAuth();
  const [query, setQuery] = useState("");
  const [alertCount, setAlertCount] = useState(0);

  const onLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!admin.token || onLoginPage) return;
    api.analyticsSummary(admin.token)
      .then((s) => setAlertCount(s.high_priority))
      .catch(() => undefined);
  }, [admin.token, onLoginPage, pathname]);

  if (ready && !admin.token && !onLoginPage) {
    router.replace("/admin/login");
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/admin/gaps?search=${encodeURIComponent(query.trim())}`);
    setQuery("");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-[#0e2242] text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <Landmark size={20} />
            </span>
            <span>
              <span className="block font-extrabold text-base leading-tight tracking-tight">Scheme Sync</span>
              <span className="block text-[10px] text-slate-300">Right Benefit • Right Person • Right Time</span>
            </span>
          </Link>

          {admin.token && (
            <form onSubmit={submitSearch} className="relative hidden md:block flex-1 max-w-xl mx-auto">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, Aadhaar, scheme, village…"
                className="w-full rounded-full border-0 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </form>
          )}

          {admin.token && (
            <div className="ml-auto flex items-center gap-3">
              <Link href="/admin/gaps" title="High-priority alerts"
                className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 transition">
                <Bell size={18} />
                {alertCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
                    {alertCount}
                  </span>
                )}
              </Link>
              <div className="hidden sm:flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 border border-white/20">
                  <UserIcon size={17} />
                </span>
                <span>
                  <span className="block text-xs font-bold leading-tight">
                    {admin.user?.role === "admin" ? "District Officer" : (admin.user?.name ?? "Officer")}
                  </span>
                  <span className="block text-[10px] text-slate-300 capitalize">
                    {admin.user?.role?.replace(/_/g, " ") ?? "Officer"}
                  </span>
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white text-xs gap-1.5"
                onClick={() => { adminLogout(); router.push("/admin/login"); }}
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
        <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600" />
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        {/* ── Sidebar (desktop) ── */}
        {admin.token && !onLoginPage && (
          <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-[#0a1830] text-slate-300 min-h-[calc(100vh-4rem-4px)] sticky top-[68px] self-start">
            <nav className="flex-1 space-y-1 p-3">
              <Suspense fallback={null}>
                <SidebarLinks pathname={pathname} variant="desktop" />
              </Suspense>
            </nav>
            <div className="p-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-[11px] font-bold text-white">Bridging the Gap</p>
                <p className="text-[10px] text-slate-400">in Welfare Delivery</p>
                <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-orange-500 via-white to-green-600" />
              </div>
            </div>
          </aside>
        )}

        {/* ── Mobile nav ── */}
        {admin.token && !onLoginPage && (
          <nav className="lg:hidden w-full overflow-x-auto flex gap-1.5 bg-[#0a1830] px-3 py-2 sticky top-[68px] z-30">
            <Suspense fallback={null}>
              <SidebarLinks pathname={pathname} variant="mobile" />
            </Suspense>
          </nav>
        )}

        {/* ── Content ── */}
        <main className="flex-1 min-w-0 px-4 py-6">
          {!ready ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              Loading officer workspace…
            </div>
          ) : !admin.token && !onLoginPage ? (
            <div className="py-12 text-center text-xs text-slate-500">Redirecting to officer login…</div>
          ) : (
            children
          )}
        </main>
      </div>

      <footer className="border-t bg-white py-3 text-[11px] text-slate-500">
        <div className="mx-auto max-w-[1400px] px-4 flex flex-wrap items-center justify-between gap-2">
          <span><span className="font-bold text-slate-700">Scheme Sync</span> &nbsp;|&nbsp; AI-Powered Welfare Gap Detection</span>
          <span>Built for a Stronger, More Inclusive India 🇮🇳</span>
        </div>
      </footer>

      {/* Officer AI Chatbot */}
      <AdminChatbot />
    </div>
  );
}

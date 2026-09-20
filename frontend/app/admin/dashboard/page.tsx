"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Users, Copy, TriangleAlert, BadgeCheck, Search,
  FileText, MapPin, RefreshCw, CalendarDays,
} from "lucide-react";
import { ApiError, api, type AnalyticsSummary, type DashboardStats, type GapCase, type AdminLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Donut({ pct }: { pct: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        <circle cx="70" cy="70" r={r} fill="none" stroke="#16a34a" strokeWidth="18"
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold">{pct}%</span>
        <span className="text-[10px] text-slate-500 text-center leading-tight">Receiving<br />Benefits</span>
      </div>
    </div>
  );
}

export default function OfficerDashboard() {
  const { admin } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gaps, setGaps] = useState<GapCase[]>([]);
  const [geo, setGeo] = useState<{ village: string; gaps: number; max_priority: number; level: string }[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    if (!admin.token) return;
    setError("");
    try {
      // Phase 1 (critical): KPIs + queues paint first…
      const [s, st, g] = await Promise.all([
        api.analyticsSummary(admin.token),
        api.stats(admin.token),
        api.gapCases(admin.token, { page: 1, page_size: 100 }),
      ]);
      setSummary(s);
      setStats(st);
      setGaps(g.items);
      setUpdatedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      // …Phase 2 (deferred): heatmap + activity fill in right after.
      const [geoRes, lg] = await Promise.all([
        api.analyticsGeography(admin.token),
        api.logs(admin.token).catch(() => [] as AdminLog[]),
      ]);
      setGeo(geoRes.villages.slice(0, 6));
      setLogs(lg.slice(0, 5));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load dashboard");
    }
  }, [admin.token]);

  useEffect(() => { load(); }, [load]);
  if (!admin.token) return null;

  const anomalies = gaps.filter((g) => g.anomaly).length;
  const duplicates = summary ? (summary.by_label["Conflict Detected"] ?? 0) : 0;
  const receiving = stats?.approved ?? 0;
  const missing = summary?.open ?? 0;
  const coverage = receiving + missing > 0 ? Math.round((receiving / (receiving + missing)) * 100) : 0;
  const top = [...gaps].sort((a, b) => b.priority - a.priority).slice(0, 5);
  const maxScheme = Math.max(1, ...Object.values(summary?.by_scheme ?? { x: 1 }));
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const kpis = [
    { icon: Users, tint: "bg-red-100 text-red-600", title: String(missing), label: "Missing Beneficiaries", sub: "Eligible but not receiving benefits", live: true },
    { icon: Copy, tint: "bg-amber-100 text-amber-600", title: String(duplicates), label: "Duplicate Records", sub: "Needs verification", live: true },
    { icon: TriangleAlert, tint: "bg-violet-100 text-violet-600", title: String(anomalies), label: "Anomaly Alerts", sub: "Suspicious / inconsistent data", live: true },
    { icon: BadgeCheck, tint: "bg-emerald-100 text-emerald-600", title: String(summary?.high_priority ?? 0), label: "High Priority Cases", sub: "For immediate verification", live: true },
  ];

  async function downloadReport() {
    if (!admin.token) return;
    const res = await fetch(api.gapExportUrl({}), { headers: { Authorization: `Bearer ${admin.token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gap-cases.csv";
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Welcome, {admin.user?.role === "admin" ? "District Officer" : (admin.user?.name ?? "Officer")}
          </h1>
          <p className="text-xs text-slate-500">Here&apos;s what&apos;s happening with welfare delivery in your district today.</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p className="flex items-center gap-1.5 font-semibold text-slate-700"><CalendarDays size={14} /> {today}</p>
          <p>Last Updated: {updatedAt || "—"}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Human-in-the-loop + secure-by-design (PPT messaging) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-2.5 text-[11px] font-semibold text-indigo-800">
        <span>🤖 AI Found the Gap → <span className="text-slate-700">👮 Officer Verified</span> → 🏛️ Government Closes the Gap</span>
        <span className="ml-auto hidden sm:inline">Human-in-the-loop • Secure-by-design (RBAC, encryption, audit logs)</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-4 flex gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${k.tint}`}>
                <k.icon size={20} />
              </span>
              <div>
                <p className="text-2xl font-extrabold leading-none">{k.title}</p>
                <p className="text-xs font-bold mt-1">{k.label}</p>
                <p className="text-[11px] text-slate-500">{k.sub}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Coverage donut */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scheme Coverage Overview</CardTitle>
            <p className="text-[11px] text-slate-500">Eligible vs Beneficiaries (Across All Schemes)</p></CardHeader>
          <CardContent className="flex items-center gap-5">
            <Donut pct={coverage} />
            <div className="text-xs space-y-2">
              <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                <span><b>Eligible & Receiving</b><br />{coverage}% ({receiving.toLocaleString("en-IN")})</span></p>
              <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span><b>Eligible but Missing</b><br />{100 - coverage}% ({missing.toLocaleString("en-IN")})</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-sm">Village Gap Heatmap</CardTitle>
                <p className="text-[11px] text-slate-500">Gap intensity across villages</p></div>
              <Link href="/admin/analytics" className="text-[11px] font-bold text-blue-600">All Blocks →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> High Gap</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Medium Gap</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Low Gap</span>
            </div>
            {geo.map((g) => (
              <Link key={g.village} href="/admin/analytics"
                className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-slate-50">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  g.level === "high" ? "bg-red-500" : g.level === "medium" ? "bg-amber-400" : "bg-green-500"}`} />
                <span className="flex-1 truncate font-medium">{g.village}</span>
                <span className="text-slate-500">{g.gaps} gaps</span>
              </Link>
            ))}
            {geo.length === 0 && <p className="text-xs text-slate-400">No geography data yet — run the demo.</p>}
          </CardContent>
        </Card>

        {/* Top missing */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Top Missing Beneficiaries</CardTitle>
              <Link href="/admin/gaps" className="text-[11px] font-bold text-blue-600">View All →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-bold uppercase text-slate-400 pb-1">
              <span>Name</span><span>Scheme</span><span>Gap Score</span>
            </div>
            <div className="divide-y">
              {top.map((g) => (
                <Link key={g.id} href={`/admin/gaps/${g.id}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2 text-xs hover:bg-slate-50 rounded">
                  <span className="font-semibold truncate">{g.citizen_name}</span>
                  <span className="text-slate-500 truncate max-w-[110px]">{g.scheme_name}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${
                    g.priority >= 70 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{g.priority}</span>
                </Link>
              ))}
              {top.length === 0 && <p className="text-xs text-slate-400 py-2">No open gaps.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Scheme-wise bars */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scheme-wise Gap Analysis</CardTitle>
            <p className="text-[11px] text-slate-500">Number of eligible citizens missing benefits</p></CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 h-44">
              {Object.entries(summary?.by_scheme ?? {}).slice(0, 5).map(([name, v], i) => {
                const colors = ["bg-blue-600", "bg-amber-500", "bg-violet-500", "bg-emerald-500", "bg-cyan-500"];
                return (
                  <div key={name} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[11px] font-bold">{v.toLocaleString("en-IN")}</span>
                    <div className={`w-full rounded-t ${colors[i % colors.length]}`}
                      style={{ height: `${Math.max(8, (v / maxScheme) * 120)}px` }} />
                    <span className="text-[10px] text-center text-slate-500 leading-tight">
                      {name.length > 14 ? name.slice(0, 13) + "…" : name}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Alerts</CardTitle>
              <Link href="/admin/gaps" className="text-[11px] font-bold text-blue-600">View All →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {gaps.filter((g) => g.anomaly).slice(0, 2).map((g) => (
              <div key={`a-${g.id}`} className="flex gap-2.5 text-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <TriangleAlert size={14} /></span>
                <div><p className="font-bold">Anomaly in {g.village} village</p>
                  <p className="text-slate-500">{g.root_cause ?? g.label} · {formatDate(g.created_at)}</p></div>
              </div>
            ))}
            {duplicates > 0 && (
              <div className="flex gap-2.5 text-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Copy size={14} /></span>
                <div><p className="font-bold">Duplicate record detected</p>
                  <p className="text-slate-500">{duplicates} identity conflicts need verification</p></div>
              </div>
            )}
            {logs.slice(0, 2).map((l) => (
              <div key={l.id} className="flex gap-2.5 text-xs">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <BadgeCheck size={14} /></span>
                <div><p className="font-bold">Verification {l.action}</p>
                  <p className="text-slate-500">{l.admin_name ?? "Officer"} · {formatDate(l.created_at)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            <Link href="/admin/gaps" className="flex items-center gap-2.5 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 transition">
              <Search size={16} /> Search Citizen
            </Link>
            <Button onClick={downloadReport} className="w-full justify-start gap-2.5 bg-violet-600 hover:bg-violet-700 py-3">
              <FileText size={16} /> Generate Report
            </Button>
            <Link href="/admin/analytics" className="flex items-center gap-2.5 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition">
              <MapPin size={16} /> View Village Map
            </Link>
            <Link href="/admin/demo" className="flex items-center gap-2.5 rounded-lg bg-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-300 transition">
              <RefreshCw size={16} /> Data Sync Status
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

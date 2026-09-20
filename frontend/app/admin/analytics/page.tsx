"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, Suspense } from "react";
import { Map } from "lucide-react";
import { ApiError, api, type AnalyticsSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VillageMap = dynamic(() => import("@/components/VillageMap"), {
  ssr: false,
  loading: () => <p className="text-xs text-slate-500">Loading map…</p>,
});

/** When opened via sidebar "Village Heatmap" (?view=map), scroll to the map. */
function ScrollOnView() {
  const sp = useSearchParams();
  useEffect(() => {
    if (sp.get("view") === "map") {
      document.getElementById("village-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sp]);
  return null;
}

export default function AnalyticsPage() {
  const { admin } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [geo, setGeo] = useState<{ village: string; gaps: number; max_priority: number; level: string }[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!admin.token) return;
    try {
      setData(await api.analyticsSummary(admin.token));
      setGeo((await api.analyticsGeography(admin.token)).villages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load analytics");
    }
  }, [admin.token]);

  useEffect(() => { load(); }, [load]);
  if (!admin.token) return null;
  if (!data) return <p className="text-xs text-slate-500">{error || "Loading analytics…"}</p>;

  function bar(entries: Record<string, number>, color: string) {
    const max = Math.max(1, ...Object.values(entries));
    return Object.entries(entries).map(([k, v]) => (
      <div key={k} className="flex items-center gap-2 text-xs">
        <span className="w-40 truncate">{k}</span>
        <div className="h-2.5 flex-1 rounded bg-slate-200 overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${(v / max) * 100}%` }} />
        </div>
        <span className="w-8 text-right font-bold">{v}</span>
      </div>
    ));
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
        <Map size={20} className="text-indigo-600" /> Gap Analytics & Village Heatmap
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Total gaps", data.total_gaps], ["Open", data.open],
          ["High priority", data.high_priority], ["Resolution rate", `${(data.resolution_rate * 100).toFixed(1)}%`],
        ].map(([k, v]) => (
          <Card key={k}><CardContent className="p-3">
            <p className="text-[11px] text-slate-500">{k}</p>
            <p className="text-xl font-extrabold">{v}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">By AI label</CardTitle></CardHeader>
          <CardContent className="space-y-2">{bar(data.by_label, "bg-indigo-500")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">By scheme</CardTitle></CardHeader>
          <CardContent className="space-y-2">{bar(data.by_scheme, "bg-emerald-500")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">By district</CardTitle></CardHeader>
          <CardContent className="space-y-2">{bar(data.by_district, "bg-amber-500")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Village heatmap (high/med/low)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {geo.map((g) => (
              <div key={g.village} className="flex items-center gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-bold uppercase text-[10px] ${
                  g.level === "high" ? "bg-red-100 text-red-700" :
                  g.level === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {g.level}
                </span>
                <span className="flex-1 truncate">{g.village}</span>
                <span className="font-bold">{g.gaps} gaps</span>
              </div>
            ))}
          </CardContent></Card>
      </div>

      <p className="text-[11px] text-slate-500">
        AI candidates: {data.ai_candidates} · Officer-verified outcomes: {data.officer_verified_outcomes} (shown separately, PRD §5).
      </p>

      <Card id="village-map" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-sm">Village gap map — Madhya Pradesh (demo pins)</CardTitle>
          <p className="text-[11px] text-slate-500">Circle size = gap count · colour = severity. Click a pin for details.</p>
        </CardHeader>
        <CardContent>
          <VillageMap points={geo} />
        </CardContent>
      </Card>
      <Suspense fallback={null}>
        <ScrollOnView />
      </Suspense>
    </div>
  );
}

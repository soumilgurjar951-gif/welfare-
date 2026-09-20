"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, ScanSearch, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ApiError, api, type PagedGaps } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const LABELS = ["Potentially Eligible", "Verification Required", "Insufficient Data", "Conflict Detected", "Not Supported"];
const STATUSES = ["Open", "Verified", "FalsePositive", "NeedsMoreData", "Closed"];

function labelColor(label: string): string {
  switch (label) {
    case "Potentially Eligible": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Verification Required": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Insufficient Data": return "bg-slate-200 text-slate-700 border-slate-300";
    case "Conflict Detected": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function priorityColor(p: number): string {
  if (p >= 70) return "bg-red-500";
  if (p >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function GapCasesPage() {
  return (
    <Suspense fallback={<p className="text-xs text-slate-500">Loading gap queue…</p>}>
      <GapCasesInner />
    </Suspense>
  );
}

function GapCasesInner() {
  const { admin } = useAuth();
  const params = useSearchParams();
  const [label, setLabel] = useState(params.get("label") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [highOnly, setHighOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedGaps | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!admin.token) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.gapCases(admin.token, {
        label: label || undefined, status: status || undefined,
        search: search.trim() || undefined,
        min_priority: highOnly ? 70 : undefined, page, page_size: 20,
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load gap cases");
    } finally {
      setLoading(false);
    }
  }, [admin.token, label, status, search, highOnly, page]);

  useEffect(() => { load(); }, [load]);
  if (!admin.token) return null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  async function downloadCsv() {
    if (!admin.token) return;
    const url = api.gapExportUrl({ status: status || undefined });
    const res = await fetch(url, { headers: { Authorization: `Bearer ${admin.token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gap-cases.csv";
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <ScanSearch size={20} className="text-indigo-600" /> Welfare Gap Cases
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            AI Found the Gap → Officer Verified → Action Ready. AI only flags — officers decide.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={downloadCsv} className="gap-1.5">
          <Download size={14} /> Masked CSV
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-[11px] text-slate-500">AI candidates</p><p className="text-xl font-extrabold text-indigo-700">{data.ai_candidates}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-slate-500">Officer verified</p><p className="text-xl font-extrabold text-emerald-700">{data.officer_verified}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-slate-500">Total in view</p><p className="text-xl font-extrabold">{data.total}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-[11px] text-slate-500">High priority (≥70)</p><p className="text-xl font-extrabold text-red-700">{data.items.filter((i) => i.priority >= 70).length}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-4">
          <Select value={label} onChange={(e) => { setLabel(e.target.value); setPage(1); }}>
            <option value="">All AI labels</option>
            {LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input placeholder="Name / village / block…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={highOnly}
              onChange={(e) => { setHighOnly(e.target.checked); setPage(1); }} />
            High priority only (≥70)
          </label>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-xs text-slate-500">Loading gap queue…</p>}

      <div className="grid gap-3">
        {data?.items.map((g) => (
          <Card key={g.id} className="hover:shadow-md transition">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm">#{g.id} {g.citizen_name}</span>
                  <Badge className={labelColor(g.label)}>{g.label}</Badge>
                  <Badge variant="outline">{g.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {g.scheme_name} · {g.district} / {g.block} / {g.village} · conf {g.confidence}%
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-40 rounded bg-slate-200 overflow-hidden">
                    <div className={`h-full ${priorityColor(g.priority)}`} style={{ width: `${g.priority}%` }} />
                  </div>
                  <span className="text-[11px] font-bold">P{g.priority}</span>
                  {g.tracking_code && <span className="text-[11px] text-slate-400">{g.tracking_code}</span>}
                </div>
              </div>
              <Link href={`/admin/gaps/${g.id}`}>
                <Button size="sm" className="gap-1">Open dossier <ArrowUpRight size={14} /></Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

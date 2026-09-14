"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Search, Filter, Layers, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ApiError, api, type PagedApplications } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, maskAadhaar } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

function ApplicationsInner() {
  const { admin } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [schemeId, setSchemeId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [schemes, setSchemes] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState<PagedApplications | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!admin.token) return;
    setLoading(true);
    setError("");
    try {
      setData(
        await api.adminApplications(admin.token, {
          status: status || undefined,
          scheme_id: schemeId ? Number(schemeId) : undefined,
          search: search.trim() || undefined,
          page,
          page_size: 20,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [admin.token, status, schemeId, search, page]);

  useEffect(() => {
    if (admin.token) api.adminSchemes(admin.token).then(setSchemes).catch(() => { });
  }, [admin.token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!admin.token) return null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  function exportHref(): string {
    return api.exportUrl({
      status: status || undefined,
      scheme_id: schemeId ? Number(schemeId) : undefined,
      search: search.trim() || undefined,
    });
  }

  async function downloadCsv() {
    if (!admin.token) return;
    const res = await fetch(exportHref(), { headers: { Authorization: `Bearer ${admin.token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "applications.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Citizen Welfare Applications</h1>
            <Badge className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5">
              {data ? `${data.total} Submissions` : "Loading..."}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">Review application details, inspect attached documents, and record sanction decisions.</p>
        </div>
        <Button size="sm" variant="outline" onClick={downloadCsv} className="gap-2 text-xs font-semibold border-slate-300">
          <Download size={14} /> Export CSV Audit Record
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardContent className="p-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="text-xs">
            <option value="">All Review Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved / Sanctioned</option>
            <option value="Rejected">Rejected</option>
          </Select>

          <Select value={schemeId} onChange={(e) => { setSchemeId(e.target.value); setPage(1); }} className="text-xs">
            <option value="">All Welfare Schemes</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <div className="relative col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9 text-xs border-slate-200 h-9 rounded-lg"
              placeholder="Search by citizen name, masked Aadhaar, or scheme..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  load();
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">{error}</p>}

      {/* Data Table / Card List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">

        {/* Mobile card list — shown below md */}
        <ul className="md:hidden divide-y divide-slate-100">
          {(data?.items ?? []).map((r) => (
            <li key={r.id} className="px-4 py-3.5 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-900">{r.citizen_name}</p>
                  <p className="font-mono text-[11px] text-indigo-600 font-semibold">#{r.id}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{r.scheme_name}</span>
                <span>{r.aadhaar_masked ? maskAadhaar(r.aadhaar_masked) : r.other_gov_id ?? "—"}</span>
                <span>{formatDate(r.created_at)}</span>
              </div>
              <Link href={`/admin/applications/${r.id}`}>
                <Button size="sm" variant="outline" className="h-7 w-full text-[11px] font-semibold gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 mt-1">
                  Review Application <ArrowUpRight size={12} />
                </Button>
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop table — shown from md up */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Application ID</th>
                <th className="px-4 py-3.5">Citizen Name</th>
                <th className="px-4 py-3.5">Masked Aadhaar / ID</th>
                <th className="px-4 py-3.5">Target Scheme</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Submitted Date</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.items ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5 font-mono font-bold text-indigo-600">#{r.id}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{r.citizen_name}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">
                    {r.aadhaar_masked ? maskAadhaar(r.aadhaar_masked) : r.other_gov_id ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 font-medium">{r.scheme_name}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/admin/applications/${r.id}`}>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] font-semibold gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                        Review <ArrowUpRight size={12} />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(data?.items.length ?? 0) === 0 && !loading && (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No applications match the active filters.</p>
            <p>Try broadening your status or keyword search query.</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
        <p className="font-medium">
          Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
          {data && <span className="text-slate-400 ml-1">({data.total} total)</span>}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 text-xs gap-1">
            <ChevronLeft size={14} /> Previous
          </Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 text-xs gap-1">
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 p-8 text-center">Loading officer applications table…</p>}>
      <ApplicationsInner />
    </Suspense>
  );
}


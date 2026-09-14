"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, api, type Application } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, ArrowRight, Layers, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MyApplicationsPage() {
  const router = useRouter();
  const { citizen, ready } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !citizen.token) router.replace("/login");
  }, [ready, citizen.token, router]);

  useEffect(() => {
    if (!citizen.token) return;
    (async () => {
      try {
        setApps(await api.myApplications(citizen.token!));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load applications");
      } finally {
        setLoading(false);
      }
    })();
  }, [citizen.token]);

  if (!ready || !citizen.token) {
    return (
      <div className="mx-auto max-w-4xl p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        Loading your applications…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Welfare Applications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time status tracking for your scheme submissions and sanction decisions.
          </p>
        </div>
        <Link href="/schemes">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm">
            <Layers size={15} /> Apply for New Scheme
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Fetching submitted applications…
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">{error}</p>}

      {!loading && apps.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Applications Submitted Yet</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            You haven't submitted any scheme applications. Browse our active welfare portal to check your eligibility.
          </p>
          <Link href="/schemes" className="inline-block">
            <Button size="sm" className="bg-indigo-600 text-white font-bold text-xs gap-1.5">
              Browse Available Schemes <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {apps.map((a) => (
          <Link key={a.id} href={`/applications/${a.id}`} className="block">
            <Card className="group border border-slate-200/80 bg-white hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                      {a.scheme_name ?? `Scheme #${a.scheme_id}`}
                    </CardTitle>
                    <p className="text-[11px] text-slate-500 font-mono">App #{a.id} · {formatDate(a.created_at)}</p>
                  </div>
                </div>
                <div className="shrink-0 pt-0.5">
                  <StatusBadge status={a.status} />
                </div>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2 border-t pt-3">
                <p className="line-clamp-2 leading-relaxed text-slate-700">{a.reason}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition">
                    View Progress Stepper & Details <ArrowRight size={12} />
                  </span>
                  {a.documents && a.documents.length > 0 && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                      📎 {a.documents.length} Document(s)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}


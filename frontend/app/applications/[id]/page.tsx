"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ApiError, api, type Application } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatINR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Download,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Building,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { citizen, ready } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && !citizen.token) router.replace("/login");
  }, [ready, citizen.token, router]);

  useEffect(() => {
    if (!citizen.token) return;
    (async () => {
      try {
        setApp(await api.myApplication(citizen.token!, Number(params.id)));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load application details");
      }
    })();
  }, [citizen.token, params.id]);

  if (!ready || !citizen.token) {
    return (
      <div className="mx-auto max-w-3xl p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        Loading application details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">{error}</p>
      </div>
    );
  }

  if (!app) return null;

  // Stepper state calculations
  const steps = [
    { title: "Application Submitted", done: true, time: formatDate(app.created_at) },
    {
      title: "Verification & Audit",
      done: app.status !== "Pending",
      active: app.status === "Pending",
      time: app.decided_at ? formatDate(app.decided_at) : "Under officer review",
    },
    {
      title: app.status === "Approved" ? "Sanctioned & Disbursed" : app.status === "Rejected" ? "Application Closed" : "Final Decision",
      done: app.status === "Approved" || app.status === "Rejected",
      status: app.status,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6 pb-16">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition">
        <ArrowLeft size={14} /> Back to My Applications
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{app.scheme_name ?? `Scheme #${app.scheme_id}`}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1">Application ID: #{app.id} • Applied on {formatDate(app.created_at)}</p>
        </div>
      </div>

      {/* Visual Stepper Tracker */}
      <Card className="border border-slate-200/80 bg-white p-6 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-6">Application Progress Tracker</h3>

        {/* Mobile: vertical stack */}
        <div className="flex flex-col gap-4 sm:hidden">
          {steps.map((s, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition ${s.status === "Rejected"
                    ? "bg-rose-600"
                    : s.done
                      ? "bg-emerald-500"
                      : s.active
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-200 text-slate-500"
                  }`}
              >
                {s.status === "Rejected" ? <XCircle size={18} /> : s.done ? <CheckCircle2 size={18} /> : <Clock size={18} />}
              </div>
              <div className="pt-0.5">
                <p className="text-sm font-bold text-slate-900 leading-snug">{s.title}</p>
                {s.time && <p className="text-[11px] text-slate-500 mt-0.5">{s.time}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: horizontal 3-col grid */}
        <div className="hidden sm:grid grid-cols-3 gap-2 relative">
          {steps.map((s, idx) => (
            <div key={idx} className="flex flex-col items-center text-center space-y-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-bold text-sm shadow-sm transition ${s.status === "Rejected"
                    ? "bg-rose-600"
                    : s.done
                      ? "bg-emerald-500"
                      : s.active
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-200 text-slate-500"
                  }`}
              >
                {s.status === "Rejected" ? <XCircle size={20} /> : s.done ? <CheckCircle2 size={20} /> : <Clock size={20} />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{s.title}</p>
                <p className="text-[10px] text-slate-500">{s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Main Details Card */}
      <Card className="border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-600 to-blue-600" />
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Application Reason & Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs sm:text-sm">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap">
            {app.reason}
          </div>

          {/* Decision Box */}
          {app.status === "Approved" && (
            <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-base text-emerald-800">
                <CheckCircle2 size={20} className="text-emerald-600" />
                Application Approved & Sanctioned!
              </div>
              {app.benefit_amount && (
                <p className="text-sm font-semibold">
                  Approved Benefit Amount: <span className="text-lg font-bold text-emerald-700">{formatINR(app.benefit_amount)}</span>
                </p>
              )}
              {app.remarks && <p className="text-xs text-emerald-800"><strong>Officer Remarks:</strong> {app.remarks}</p>}
              {app.decided_at && <p className="text-[11px] text-emerald-700/80">Sanctioned on {formatDate(app.decided_at)}</p>}
            </div>
          )}

          {app.status === "Rejected" && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-rose-50 p-5 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-base text-rose-800">
                  <XCircle size={20} className="text-rose-600" />
                  Application Declined
                </div>
                <p className="text-xs font-semibold">Rejection Reason: {app.rejection_reason}</p>
                {app.remarks && <p className="text-xs text-rose-800"><strong>Officer Remarks:</strong> {app.remarks}</p>}
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-bold text-amber-800">Citizen benefit: Need help? Govt benefit: feedback to improve.</p>
                <p className="text-xs text-amber-900 mt-1">Visit nearest Block Office with Application ID <span className="font-mono font-bold">#{app.id}</span> or re-apply with corrected documents after 7 days.</p>
                <Link href="/schemes"><Button size="sm" variant="outline" className="mt-2 h-7 text-xs border-amber-300">Browse other schemes</Button></Link>
              </div>
            </div>
          )}
          {app.status === "Pending" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-600" />
              <p className="text-xs text-amber-800"><span className="font-bold">Govt SLA: 48 hours.</span> Officer will verify documents and update here. Citizen benefit: no need to visit office.</p>
            </div>
          )}

          {/* Attached Documents */}
          {app.documents.length > 0 && (
            <div className="space-y-2 pt-3 border-t">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Submitted Supporting Documents ({app.documents.length})
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {app.documents.map((d) => (
                  <a
                    key={d.id}
                    href={api.uploadUrl(d.file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs hover:border-indigo-300 hover:bg-indigo-50/50 transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={16} className="text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate group-hover:text-indigo-700">{d.file_name}</span>
                    </div>
                    <Download size={14} className="text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


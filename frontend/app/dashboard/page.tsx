"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, api, type Application, type Scheme } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  UserCheck,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Bot,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { citizen, ready } = useAuth();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
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
        const [s, a] = await Promise.all([api.schemes(), api.myApplications(citizen.token!)]);
        setSchemes(s);
        setApps(a);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [citizen.token]);

  if (!ready || !citizen.token) return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 pb-16 animate-pulse">
      {/* Banner skeleton */}
      <div className="h-36 rounded-3xl bg-slate-200" />
      {/* KPI skeletons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200" />
        ))}
      </div>
      {/* Content skeletons */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6 h-64 rounded-2xl bg-slate-200" />
        <div className="lg:col-span-6 h-64 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );

  const counts = {
    Pending: apps.filter((a) => a.status === "Pending").length,
    Approved: apps.filter((a) => a.status === "Approved").length,
    Rejected: apps.filter((a) => a.status === "Rejected").length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 pb-16">
      {/* Welcome Banner */}
      <div className="gov-stripe rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck size={14} className="text-emerald-300" />
            <span>Verified Citizen Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {citizen.user?.name}!</h1>
          <p className="text-sm text-indigo-100 max-w-xl">
            Track your scheme applications in real-time, view sanction letters, and apply for new benefits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link href="/schemes">
            <Button size="sm" className="bg-white text-indigo-900 hover:bg-slate-100 font-bold px-4 gap-1.5 shadow-md">
              <Layers size={16} /> Explore Schemes
            </Button>
          </Link>
          <Link href="/applications">
            <Button size="sm" variant="outline" className="border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur text-xs font-semibold gap-1">
              <FileText size={14} /> My Applications
            </Button>
          </Link>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">{error}</p>}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Applications", value: apps.length, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Pending Review", value: counts.Pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Approved Schemes", value: counts.Approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Rejected Submissions", value: counts.Rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
        ].map((c, idx) => {
          const Icon = c.icon;
          return (
            <Card key={idx} className="border border-slate-200/80 bg-white hover:shadow-md transition">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-slate-900">{c.value}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-1">{c.label}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${c.bg} ${c.color}`}>
                  <Icon size={22} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mutual Benefit: Your Benefit Summary + Govt Tracking Timeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Benefit Received</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {(() => {
                    const total = apps.filter(a=>a.status==="Approved").reduce((s,a)=>s+Number(a.benefit_amount||0),0);
                    return total > 0 ? `₹${total.toLocaleString("en-IN")}` : "—";
                  })()}
                </p>
                <p className="text-xs text-slate-600 mt-1">{counts.Approved} approved • Direct Bank Transfer</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/70 border border-emerald-100 px-3 py-2">
              <p className="text-[11px] font-semibold text-emerald-800">Govt benefit: Transparent DBT — every rupee traceable in audit log.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border border-indigo-100 bg-white shadow-xs">
          <CardContent className="p-5">
            {(() => {
              const latest = apps[0];
              if (!latest) return (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Start your first application</p>
                    <p className="text-xs text-slate-500 mt-1">Govt benefit: only eligible citizens apply → faster processing.</p>
                  </div>
                  <Link href="/schemes"><Button size="sm" className="bg-indigo-600 text-white">Browse Schemes</Button></Link>
                </div>
              );
              const steps = [
                { k: "Applied", done: true },
                { k: "Officer Review", done: latest.status !== "Pending" },
                { k: latest.status === "Approved" ? "Approved" : latest.status === "Rejected" ? "Rejected" : "Decision", done: latest.status !== "Pending" },
                { k: "Bank Credit", done: latest.status === "Approved" },
              ];
              return (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Application #{latest.id} — {latest.scheme_name} <StatusBadge status={latest.status} /></p>
                    <Link href={`/applications/${latest.id}`} className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">Track <ArrowRight size={12} /></Link>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {steps.map((s,i)=>(
                      <div key={i} className="flex items-center gap-2 flex-1">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${s.done ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>{i+1}</div>
                        <span className={`text-xs font-medium ${s.done ? "text-slate-900" : "text-slate-400"}`}>{s.k}</span>
                        {i < steps.length-1 && <div className={`h-0.5 flex-1 ${s.done ? "bg-indigo-600" : "bg-slate-200"}`} />}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Citizen benefit: real-time tracking • Govt benefit: fewer enquiry calls, full visibility.</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Help Card */}
      <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 shadow-xs">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Need Help Finding Schemes?
                <Badge className="bg-indigo-600 text-white text-[10px]">Multilingual AI</Badge>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Our AI Assistant can guide you in Hindi, Marathi, Tamil, Telugu, Kannada & more. Ask any question in the bottom-right chat!
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              const chatBtn = document.querySelector("button:has(.lucide-bot)");
              if (chatBtn) (chatBtn as HTMLButtonElement).click();
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs whitespace-nowrap shadow-sm"
          >
            Open AI Chatbot
          </Button>
        </CardContent>
      </Card>

      {/* Recent Applications & Available Schemes */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6 border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Recent Applications</CardTitle>
              <CardDescription className="text-xs text-slate-500">Track application progress</CardDescription>
            </div>
            <Link href="/applications">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                View all <ArrowRight size={13} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {apps.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-slate-500">No applications submitted yet.</p>
                <Link href="/schemes">
                  <Button size="sm" className="bg-indigo-600 text-white text-xs">Browse Schemes</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {apps.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <Link href={`/applications/${a.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 transition">
                        {a.scheme_name ?? `Scheme #${a.scheme_id}`}
                      </Link>
                      <p className="text-xs text-slate-500">Applied on {formatDate(a.created_at)}</p>
                    </div>
                    <Link href={`/applications/${a.id}`}>
                      <StatusBadge status={a.status} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 border border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Available Schemes ({schemes.length})</CardTitle>
              <CardDescription className="text-xs text-slate-500">Check eligibility & apply</CardDescription>
            </div>
            <Link href="/schemes">
              <Button size="sm" className="bg-indigo-600 text-white text-xs gap-1">
                Browse All <ArrowRight size={13} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {schemes.slice(0, 3).map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200/80 p-3.5 hover:border-indigo-200 hover:bg-slate-50/50 transition">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900">{s.name}</h4>
                  <Link href={`/apply/${s.id}`}>
                    <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                      Apply
                    </Button>
                  </Link>
                </div>
                <p className="line-clamp-2 text-xs text-slate-600 mt-1">{s.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


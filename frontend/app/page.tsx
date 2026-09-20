import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Link2,
  TriangleAlert,
  ListOrdered,
  Database,
  ScanSearch,
  UserCheck,
  Landmark,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Officer-only public landing — PPT-aligned messaging for "Welfare Gap AI". */

const pillars = [
  {
    icon: ScanSearch,
    title: "Missed-Beneficiary Detection",
    text: "Identifies eligible citizens who are not receiving the benefits they are entitled to.",
  },
  {
    icon: Link2,
    title: "Cross-Department Record Matching",
    text: "Links fragmented databases — land, citizen registry, bank, scheme records — into one view.",
  },
  {
    icon: TriangleAlert,
    title: "Anomaly & Duplicate Detection",
    text: "Flags duplicate records and suspicious inconsistencies before money goes out.",
  },
  {
    icon: ListOrdered,
    title: "Priority-Based Verification",
    text: "Officers see high-priority cases first, scored 0–100 with evidence attached.",
  },
];

const flow = [
  {
    icon: Database,
    step: "Step 1",
    title: "Data Integration",
    text: "Departmental CSV / API records — land, citizens, bank, schemes — loaded into one layer.",
  },
  {
    icon: ScanSearch,
    step: "Step 2",
    title: "AI Matching & Gap Detection",
    text: "Rules + models match eligibility against enrolment and flag who the system missed.",
  },
  {
    icon: UserCheck,
    step: "Step 3",
    title: "Officer Verification",
    text: "AI only flags — officers verify, request info, or mark false positives. Humans decide.",
  },
  {
    icon: Landmark,
    step: "Step 4",
    title: "Government Closes the Gap",
    text: "Verified cases become action memoranda with QR tracking codes — benefits reach citizens.",
  },
];

const impact: [string, number, number, string][] = [
  ["Beneficiaries identified", 22, 88, "%"],
  ["Verification speed index", 20, 82, ""],
  ["Duplicate detection accuracy", 41, 93, "%"],
  ["Scheme coverage visibility", 46, 90, "%"],
  ["Manual effort required", 100, 35, "%"],
];

const trust = [
  "Role-based access (7 officer roles, least privilege)",
  "Aadhaar stored hashed + masked only — never raw",
  "TOTP two-factor login for all officers",
  "Append-only hash-chained audit trail",
  "Human-in-the-loop: AI flags, officers decide",
];

export default function Home() {
  return (
    <div className="space-y-16 pb-16">
      {/* ── P0: PPT Hero ── */}
      <section className="gov-stripe relative overflow-hidden text-white pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center px-4 relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            <Sparkles size={14} className="text-amber-300" />
            <span>AI-Powered Welfare Gap Detection</span>
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl leading-tight">
            Welfare Gap AI{" "}
            <span className="bg-gradient-to-r from-sky-300 via-indigo-200 to-emerald-300 bg-clip-text text-transparent">
              — Finding Citizens the System Misses
            </span>
          </h1>

          <p className="max-w-3xl text-base md:text-lg text-slate-200 font-normal leading-relaxed">
            An AI-powered welfare intelligence layer that analyzes fragmented government
            data to identify eligible citizens who may be missing expected welfare benefits.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            <Link href="/admin/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-indigo-500/30 border border-white/20 gap-2 px-6">
                For Officers → Gap Detection Dashboard <ArrowRight size={18} />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur font-semibold px-6">
                See how it works
              </Button>
            </a>
          </div>

          <p className="text-xs text-slate-300 font-medium tracking-wide">
            Right Benefit • Right Person • Right Time
          </p>
        </div>
      </section>

      {/* ── Core loop strip ── */}
      <section className="mx-auto max-w-6xl px-4 -mt-14 relative z-20">
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
          {["AI Finds the Gap", "Officer Verifies", "Government Closes the Gap"].map((t, i) => (
            <div key={t} className="flex items-center gap-2 sm:gap-4">
              {i > 0 && <ArrowRight size={16} className="text-indigo-500 hidden sm:block" />}
              <span className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-extrabold ${
                i === 1 ? "bg-indigo-600 text-white shadow" : "bg-indigo-50 text-indigo-700"}`}>
                {t}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-3 font-semibold">
          AI only flags — officers decide. Human-in-the-loop, always.
        </p>
      </section>

      {/* ── P2: Problem statement (SIH26129, short) ── */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl border border-red-100 bg-gradient-to-r from-red-50/80 via-white to-amber-50/80 p-5 sm:p-7 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">The Problem</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Fragmented systems leave eligible citizens behind
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mt-3 max-w-3xl">
            Land records live in one department, citizen registries in another, bank and
            scheme data somewhere else. With no common view, eligible families silently
            miss the benefits meant for them — discovered only during manual drives, if at all.
            Welfare Gap AI joins these fragments and surfaces every missed citizen with evidence,
            so no one the system owes is left invisible.
          </p>
        </div>
      </section>

      {/* ── P1: PPT 4 pillars ── */}
      <section className="mx-auto max-w-6xl px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">What it does</span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Four pillars of gap intelligence</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Card key={idx} className="border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition">
                <CardHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                    <Icon size={24} />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">{p.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 leading-relaxed pt-0">{p.text}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── P2: How it works ── */}
      <section id="how-it-works" className="bg-slate-100/70 py-16 border-y border-slate-200/80 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">End to end</span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How it works</h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">Data Integration → AI Matching → Gap Detection → Officer Action.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {flow.map((s, idx) => {
              const Icon = s.icon;
              return (
                <Card key={idx} className="relative border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                        <Icon size={24} />
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">{s.step}</span>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 leading-relaxed pt-0">{s.text}</CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── P1: Impact table ── */}
      <section className="mx-auto max-w-4xl px-4 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Why it matters</span>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Manual process vs Welfare Gap AI</h2>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Metric</th>
                  <th className="px-4 py-3 text-right">Before (Manual)</th>
                  <th className="px-4 py-3 text-right">After (Welfare Gap AI)</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {impact.map(([label, before, after, unit]) => {
                  const goodWhenLow = before > after;
                  const pct = Math.max(4, Math.min(100, after));
                  return (
                    <tr key={label} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold">{label}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{before}{unit}</td>
                      <td className={`px-4 py-3 text-right font-extrabold ${goodWhenLow ? "text-indigo-600" : "text-emerald-600"}`}>
                        {after}{unit}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-2 w-36 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${goodWhenLow ? "bg-indigo-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-[11px] text-slate-500 text-center">Representative demo figures illustrating the expected shift from manual drives to AI-assisted verification.</p>
      </section>

      {/* ── P2: Security & trust ── */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 p-5 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Secure by design, trusted by officers</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mt-4">
            {trust.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Link href="/admin/login">
              <Button className="gap-2">Open officer workspace <ArrowRight size={16} /></Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  Landmark,
  ShieldCheck,
  Sparkles,
  Bot,
  CheckCircle2,
  TrendingUp,
  Users,
  Award,
  Search,
  Banknote,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const stats = [
  { label: "Active Welfare Schemes", value: "10+", icon: Landmark },
  { label: "Direct Benefit Transfer", value: "₹2.5L Max", icon: TrendingUp },
  { label: "Verified Beneficiaries", value: "100%", icon: ShieldCheck },
  { label: "AI Assistance Languages", value: "8 Languages", icon: Bot },
];

const featuredSchemes = [
  {
    title: "Pradhan Mantri Awas Yojana (PMAY)",
    category: "Housing Support",
    benefit: "Financial assistance up to ₹2,50,000 for constructing a pucca house.",
    tag: "High Priority",
    color: "from-blue-600 to-indigo-600",
  },
  {
    title: "PM-Kisan Samman Nidhi",
    category: "Agriculture & Farmers",
    benefit: "₹6,000 per year direct income support transferred in 3 equal installments.",
    tag: "Direct Cash Transfer",
    color: "from-emerald-600 to-teal-600",
  },
  {
    title: "National Social Assistance Pension",
    category: "Senior & Pension",
    benefit: "Monthly pension for senior citizens, widows, and persons with disabilities.",
    tag: "Monthly Income",
    color: "from-amber-600 to-orange-600",
  },
  {
    title: "Post-Matric Scholarship Scheme",
    category: "Education & Youth",
    benefit: "Full tuition reimbursement & monthly maintenance allowance for eligible students.",
    tag: "Education Grant",
    color: "from-purple-600 to-pink-600",
  },
];

const steps = [
  {
    icon: FileText,
    step: "Step 1",
    title: "Register with Gov ID",
    text: "Sign up securely using Aadhaar (masked), Voter ID, PAN, or Driving License. Data is fully encrypted.",
  },
  {
    icon: ClipboardCheck,
    step: "Step 2",
    title: "Apply & Upload Docs",
    text: "Browse welfare schemes, check eligibility, write application reason, and attach income/land proofs.",
  },
  {
    icon: ShieldCheck,
    step: "Step 3",
    title: "Officer Verification & Benefit",
    text: "Officers inspect applications, record audit logs, and approve direct benefit transfers directly to your bank.",
  },
];

export default function LandingPage() {
  const [live, setLive] = useState<{ total_applications: number; approved: number; total_disbursed: number; active_schemes: number } | null>(null);
  useEffect(() => {
    api.publicStats().then(setLive).catch(()=>{});
  }, []);
  return (
    <div className="space-y-16 pb-16">
      {/* Modern Hero Section */}
      <section className="gov-stripe relative overflow-hidden text-white pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center px-4 relative z-10 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur animate-fade-in">
            <Sparkles size={14} className="text-amber-300" />
            <span>National Digital Welfare Gateway</span>
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl leading-tight">
            Empowering Citizens with Direct <span className="bg-gradient-to-r from-sky-300 via-indigo-200 to-emerald-300 bg-clip-text text-transparent">Welfare Benefits</span>
          </h1>

          <p className="max-w-2xl text-base md:text-lg text-slate-200 font-normal leading-relaxed">
            Apply for government housing, farming, pension, and scholarship schemes seamlessly.
            Get instant eligibility assistance in 8 Indian languages with our smart AI chatbot.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-indigo-500/30 border border-white/20 gap-2 px-6">
                Register as Citizen <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/schemes">
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur font-semibold px-6 gap-2">
                <Search size={16} /> Explore All Schemes
              </Button>
            </Link>
          </div>

          {/* Quick AI Assistant Highlight Pill */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-indigo-300/30 bg-indigo-950/60 p-3.5 backdrop-blur max-w-lg text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Bot size={20} />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                AI Scheme Assistant Ready 🤖
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300 border border-emerald-400/30">8 Languages</span>
              </p>
              <p className="text-slate-300">Click the bottom-right assistant icon to ask questions in Hindi, Marathi, Tamil, Telugu & more!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics & Key Stats Bar */}
      <section className="mx-auto max-w-6xl px-4 -mt-14 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 rounded-2xl bg-white p-4 sm:p-6 shadow-xl border border-slate-200/80">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="flex items-center gap-2.5 sm:gap-3.5 p-1 sm:p-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight mt-0.5">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live Transparency — benefits citizen (trust) + govt (showcase) */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><FileCheck size={16} /></span>
              <div>
                <p className="text-sm font-bold text-slate-900">Live Transparency — Direct Benefit Transfer</p>
                <p className="text-xs text-slate-600">Citizen benefit: every application traceable • Govt benefit: real-time disbursement audit.</p>
              </div>
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Updated live from DB</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            {[
              { label: "Active Schemes", value: live ? live.active_schemes : "5+", sub: "Govt approved" },
              { label: "Applications Received", value: live ? live.total_applications.toLocaleString("en-IN") : "—", sub: "Total volume" },
              { label: "Beneficiaries Approved", value: live ? live.approved.toLocaleString("en-IN") : "—", sub: "Sanctioned" },
              { label: "Total Disbursed", value: live ? `₹${Number(live.total_disbursed).toLocaleString("en-IN")}` : "—", sub: "Direct to bank" },
            ].map((c,i)=>(
              <div key={i} className="rounded-xl bg-white border border-slate-200 p-3.5">
                <p className="text-lg font-extrabold text-slate-900">{c.value}</p>
                <p className="text-xs font-semibold text-slate-700">{c.label}</p>
                <p className="text-[11px] text-slate-500">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Schemes Grid */}
      <section className="mx-auto max-w-6xl px-4 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Available Support</span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mt-1">Featured Welfare Schemes</h2>
          </div>
          <Link href="/schemes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition">
            View All Schemes <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {featuredSchemes.map((fs, idx) => (
            <Card key={idx} className="group overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className={`h-2 bg-gradient-to-r ${fs.color}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {fs.category}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                    {fs.tag}
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition mt-2">
                  {fs.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">{fs.benefit}</p>
                <Link href="/schemes" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition">
                  Apply Now <ArrowRight size={14} />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Timeline */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Simple Process</span>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How Scheme Sync Works</h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">Get your government scheme benefit in 3 quick transparent steps.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, idx) => {
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
                    <CardTitle className="text-lg font-bold text-slate-900">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 leading-relaxed">{s.text}</CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}


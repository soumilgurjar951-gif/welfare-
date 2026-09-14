"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, api, type Scheme } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Layers, ArrowRight, CheckCircle2, Bot, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setSchemes(await api.schemes());
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load schemes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [quizAge, setQuizAge] = useState("");
  const [quizCategory, setQuizCategory] = useState("");
  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      (s.eligibility && s.eligibility.toLowerCase().includes(search.toLowerCase()));
    // Mutual benefit: quick eligibility narrows — citizen saves time, govt gets fewer ineligible
    if (!matchesSearch) return false;
    if (quizAge) {
      const ageOk = s.name.toLowerCase().includes("pension") ? Number(quizAge) >= 60 : true;
      if (quizCategory === "student" && !s.name.toLowerCase().includes("scholarship")) return false;
      if (quizCategory === "farmer" && !s.name.toLowerCase().includes("kisan")) return false;
      if (quizCategory === "housing" && !s.name.toLowerCase().includes("awas")) return false;
      if (!ageOk) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
          <Layers size={14} /> National Welfare Catalogue
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Available Welfare Schemes</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Browse active government welfare programs, check eligibility criteria, and apply directly with secure digital verification.
        </p>
      </div>

      {/* Mutual benefit: Quick eligibility — citizen finds right scheme, govt gets fewer invalid apps */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-600" /> Quick Eligibility Check</p>
          <p className="text-xs text-slate-600">Answer 2 questions → we highlight matching schemes. Govt benefit: fewer ineligible applications.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={quizCategory} onChange={e=>setQuizCategory(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs">
            <option value="">All categories</option>
            <option value="housing">Housing (PMAY)</option>
            <option value="farmer">Farmer (PM-Kisan)</option>
            <option value="student">Student (Scholarship)</option>
          </select>
          <select value={quizAge} onChange={e=>setQuizAge(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs">
            <option value="">Any age</option>
            <option value="25">Age &lt;60</option>
            <option value="65">Age 60+</option>
          </select>
          {(quizCategory || quizAge) && <Button size="sm" variant="outline" className="h-9 text-xs" onClick={()=>{setQuizCategory(""); setQuizAge("");}}>Clear</Button>}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search schemes by name, keyword, or eligibility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-slate-200 text-xs sm:text-sm rounded-xl focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1">
            {filteredSchemes.length} Active Schemes
          </Badge>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading welfare schemes…
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200">{error}</p>}

      {!loading && filteredSchemes.length === 0 && (
        <div className="py-12 text-center space-y-3 bg-white rounded-2xl border p-8">
          <p className="text-base font-semibold text-slate-700">No schemes found matching "{search}"</p>
          <Button variant="outline" size="sm" onClick={() => setSearch("")} className="text-xs">
            Clear Search Filter
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {filteredSchemes.map((s) => (
          <Card key={s.id} className="group overflow-hidden border border-slate-200/80 bg-white hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 text-[11px]">
                    Active Scheme #{s.id}
                  </Badge>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 size={12} /> Direct Benefit
                  </span>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition mt-2">
                  {s.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 leading-relaxed mt-1">
                  {s.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {s.eligibility && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-0.5">Eligibility Criteria:</span>
                    {s.eligibility}
                  </div>
                )}
              </CardContent>
            </div>

            <CardContent className="pt-2 pb-5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const chatBtn = document.querySelector("button:has(.lucide-bot)");
                  if (chatBtn) (chatBtn as HTMLButtonElement).click();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                <Bot size={14} /> Ask AI about this scheme
              </button>
              <Link href={`/apply/${s.id}`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-bold shadow-sm">
                  Apply Now <ArrowRight size={14} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


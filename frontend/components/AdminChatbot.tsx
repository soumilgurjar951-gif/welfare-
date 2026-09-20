"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ShieldCheck, X, Send, RotateCcw, Users, FileText,
  TriangleAlert, BadgeCheck, TrendingUp, MapPin,
  ChevronRight, Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type AnalyticsSummary, type DashboardStats } from "@/lib/api";

interface GapItem { anomaly: boolean }

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  table?: { headers: string[]; rows: string[][] };
  actions?: { label: string; href: string; color?: string }[];
}

interface BotReply {
  text: string;
  table?: { headers: string[]; rows: string[][] };
  actions?: { label: string; href: string; color?: string }[];
}

const QUICK_PROMPTS = [
  { icon: Users, label: "Missing Beneficiaries" },
  { icon: TriangleAlert, label: "Fraud & Anomalies" },
  { icon: BadgeCheck, label: "Pending Applications" },
  { icon: TrendingUp, label: "Scheme Coverage Stats" },
  { icon: MapPin, label: "Village Heatmap" },
  { icon: FileText, label: "Generate Report" },
];

function getBotReply(
  query: string,
  summary: AnalyticsSummary | null,
  stats: DashboardStats | null,
  gaps: GapItem[],
): BotReply {
  const q = query.toLowerCase();

  if (q.includes("missing") || q.includes("beneficiar") || q.includes("eligible")) {
    const open = summary?.open ?? 0;
    const hp = summary?.high_priority ?? 0;
    const byScheme = summary?.by_scheme ?? {};
    const rows = Object.entries(byScheme).map(([s, v]) => [
      s, String(v), v > 10 ? "🔴 High" : v > 3 ? "🟡 Medium" : "🟢 Low",
    ]);
    return {
      text: `📋 **Missing Beneficiaries Summary**\n\n• **Total Open Cases:** ${open}\n• **High Priority:** ${hp} (need immediate action)\n\nScheme-wise breakdown 👇`,
      table: rows.length > 0 ? { headers: ["Scheme", "Missing Count", "Priority"], rows } : undefined,
      actions: [{ label: "View All Cases →", href: "/admin/gaps", color: "blue" }],
    };
  }

  if (q.includes("fraud") || q.includes("anomal") || q.includes("duplicate") || q.includes("conflict")) {
    const anomalies = gaps.filter((g) => g.anomaly).length;
    const duplicates = summary?.by_label?.["Conflict Detected"] ?? 0;
    return {
      text: `🚨 **Fraud & Anomaly Report**\n\n• **Anomalies Detected:** ${anomalies} suspicious records\n• **Duplicate ID Conflicts:** ${duplicates} cases\n\n⚠️ Needs immediate officer verification before any disbursement.`,
      actions: [
        { label: "Review Anomalies →", href: "/admin/gaps?label=Conflict+Detected", color: "red" },
        { label: "Audit Log →", href: "/admin/logs", color: "slate" },
      ],
    };
  }

  if (q.includes("application") || q.includes("pending") || q.includes("review") || q.includes("approve")) {
    const total = stats?.total ?? 0;
    const pending = stats?.pending ?? 0;
    const approved = stats?.approved ?? 0;
    const rejected = stats?.rejected ?? 0;
    return {
      text: `📂 **Application Queue Status**\n\n• **Total Submissions:** ${total}\n• **⏳ Pending Review:** ${pending} (action required)\n• **✅ Approved:** ${approved}\n• **❌ Rejected:** ${rejected}\n\nApproval rate: ${total > 0 ? Math.round((approved / total) * 100) : 0}%`,
      actions: [
        { label: "Review Pending →", href: "/admin/applications?status=Pending", color: "amber" },
        { label: "All Applications →", href: "/admin/applications", color: "blue" },
      ],
    };
  }

  if (q.includes("coverage") || q.includes("stat") || q.includes("overview") || q.includes("summary")) {
    const open = summary?.open ?? 0;
    const approved = stats?.approved ?? 0;
    const total = open + approved;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    return {
      text: `📊 **District Welfare Coverage**\n\n• **Eligible Citizens:** ${total.toLocaleString("en-IN")}\n• **Receiving Benefits:** ${approved.toLocaleString("en-IN")} (${pct}%)\n• **Not Covered:** ${open.toLocaleString("en-IN")} (${100 - pct}%)\n\n${pct < 60 ? "⚠️ Below 60% — immediate outreach needed!" : pct < 80 ? "📈 Moderate — push for last-mile delivery." : "✅ Good coverage — focus on anomaly resolution."}`,
      actions: [{ label: "Full Analytics →", href: "/admin/analytics", color: "green" }],
    };
  }

  if (q.includes("village") || q.includes("heatmap") || q.includes("map") || q.includes("block")) {
    return {
      text: `🗺️ **Village Gap Heatmap**\n\n• 🔴 **High Gap Zones** — Urgent field verification\n• 🟡 **Medium Gap Zones** — Schedule outreach camps\n• 🟢 **Low Gap Zones** — Regular monitoring\n\nIdentify underserved pockets and plan targeted delivery.`,
      actions: [{ label: "Open Heatmap →", href: "/admin/analytics", color: "blue" }],
    };
  }

  if (q.includes("report") || q.includes("export") || q.includes("download") || q.includes("csv")) {
    return {
      text: `📄 **Reports & Exports**\n\n• **Gap Cases CSV** — Missing beneficiaries with priority scores\n• **Action Memo** — Individual case notes\n• **Audit Log** — All officer decisions with timestamps`,
      actions: [
        { label: "Go to Reports →", href: "/admin/reports", color: "violet" },
        { label: "Audit Log →", href: "/admin/logs", color: "slate" },
      ],
    };
  }

  if (q.includes("urgent") || q.includes("high priority") || q.includes("critical")) {
    const hp = summary?.high_priority ?? 0;
    return {
      text: `🚨 **High Priority Cases: ${hp}**\n\nThese citizens:\n• Are confirmed eligible\n• Have Aadhaar-verified identity\n• Have NO existing benefit record\n• Priority score ≥ 70\n\n⚡ Should be resolved within 48 hours.`,
      actions: [{ label: "Resolve Now →", href: "/admin/gaps?priority=high", color: "red" }],
    };
  }

  const open = summary?.open ?? 0;
  const pending = stats?.pending ?? 0;
  return {
    text: `🤖 **Officer Intelligence Assistant**\n\nI have access to live district data. Ask me about:\n\n• 👥 Missing Beneficiaries\n• 🚨 Fraud & Anomalies\n• 📂 Pending Applications\n• 📊 Coverage Stats\n• 🗺️ Village Heatmap\n• 📄 Reports & Exports\n\n**Live Status:** ${open} missing | ${pending} pending applications`,
    actions: [{ label: "View Dashboard →", href: "/admin/dashboard", color: "blue" }],
  };
}

export function AdminChatbot() {
  const { admin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [gapsData, setGapsData] = useState<GapItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Close on outside click/touch
  useEffect(() => {
    if (!isOpen) return;
    function handle(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, loading]);

  const loadData = useCallback(async () => {
    if (!admin.token) return;
    try {
      const [s, st] = await Promise.all([
        api.analyticsSummary(admin.token),
        api.stats(admin.token),
      ]);
      setSummaryData(s);
      setStatsData(st);
      // derive anomaly count from summary labels
      const anomalyCount = s?.by_label?.["Anomaly"] ?? 0;
      setGapsData(Array.from({ length: anomalyCount }, () => ({ anomaly: true })));
    } catch { /* silent */ }
  }, [admin.token]);

  useEffect(() => {
    if (!isOpen || !admin.token) return;
    loadData();
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        sender: "bot",
        text: `🙏 **Jai Hind, Officer!**\n\nI am your AI Welfare Intelligence Assistant with live district data:\n\n• Missing beneficiary records\n• Fraud & anomaly alerts\n• Application queue status\n• Village-wise coverage gaps\n\nClick a quick action or ask me anything.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: [
          { label: "Missing Beneficiaries", href: "/admin/gaps", color: "blue" },
          { label: "Review Applications", href: "/admin/applications", color: "amber" },
          { label: "Fraud Alerts", href: "/admin/gaps?label=Conflict+Detected", color: "red" },
        ],
      }]);
    }
  }, [isOpen, admin.token, loadData, messages.length]);

  function addMsg(msg: Omit<Message, "id" | "timestamp">) {
    setMessages((prev) => [...prev, {
      ...msg,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
  }

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? input).trim();
    if (!query) return;
    setInput("");
    addMsg({ sender: "user", text: query });
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const reply = getBotReply(query, summaryData, statsData, gapsData);
    addMsg({ sender: "bot", ...reply });
    setLoading(false);
  }

  if (!admin.token) return null;

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#0e2242] to-blue-700 px-5 py-3 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <ShieldCheck size={20} />
          <span className="text-sm font-bold">Officer AI</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-slide-up"
          style={{ height: "580px", width: "min(calc(100vw - 2.5rem), 420px)" }}
        >
          {/* Header */}
          <div className="bg-[#0e2242] text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Officer Intelligence AI</p>
                <p className="text-[10px] text-slate-300">Live district data • Instant insights</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setMessages([]); loadData(); }} title="Reset"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 shrink-0" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 custom-scrollbar">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                {m.sender === "bot" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0e2242] text-white mt-0.5">
                    <ShieldCheck size={13} />
                  </div>
                )}
                <div className={`max-w-[85%] space-y-2 flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${m.sender === "user"
                    ? "bg-[#0e2242] text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                    }`}>
                    <p className="whitespace-pre-line">{m.text}</p>
                    <span className={`block mt-1 text-[10px] ${m.sender === "user" ? "text-blue-200 text-right" : "text-slate-400"}`}>
                      {m.timestamp}
                    </span>
                  </div>

                  {m.table && (
                    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-[11px]">
                        <thead className="bg-slate-50 border-b">
                          <tr>{m.table.headers.map((h) => (
                            <th key={h} className="px-2.5 py-1.5 text-left font-bold text-slate-600 whitespace-nowrap">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {m.table.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              {row.map((cell, j) => <td key={j} className="px-2.5 py-1.5 text-slate-700">{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {m.actions && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.actions.map((a) => (
                        <a key={a.label} href={a.href}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${a.color === "red" ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" :
                            a.color === "amber" ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" :
                              a.color === "green" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" :
                                a.color === "violet" ? "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200" :
                                  a.color === "slate" ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200" :
                                    "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                            }`}
                        >
                          {a.label} <ChevronRight size={11} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0e2242] text-white">
                  <Loader2 size={13} className="animate-spin" />
                </div>
                <div className="flex gap-1 bg-white border px-3 py-2 rounded-full shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-700" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-700 [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-700 [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="border-t bg-white px-3 py-2 shrink-0">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Quick Actions</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {QUICK_PROMPTS.map((p) => (
                <button key={p.label} onClick={() => handleSend(p.label)}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition">
                  <p.icon size={11} /> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t bg-white p-2.5 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about beneficiaries, fraud, coverage…"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
              <button type="submit" disabled={!input.trim()}
                className="h-9 w-9 rounded-xl bg-[#0e2242] text-white hover:bg-blue-800 disabled:opacity-40 flex items-center justify-center transition">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

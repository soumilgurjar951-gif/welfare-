"use client";

import { useEffect, useState } from "react";
import { Link2, ShieldCheck } from "lucide-react";
import { ApiError, api, type AdminLog, type AuditEvent, type ChainReport } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const short = (h: string | null) => (h ? `${h.slice(0, 10)}…` : "—");

export default function AdminLogsPage() {
  const { admin } = useAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [trail, setTrail] = useState<AuditEvent[]>([]);
  const [chain, setChain] = useState<ChainReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!admin.token) return;
    api
      .logs(admin.token)
      .then(setLogs)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load audit log"));
    api
      .auditEvents(admin.token, 20)
      .then(setTrail)
      .catch(() => undefined);
  }, [admin.token]);

  async function verify() {
    if (!admin.token) return;
    setChain(null);
    try {
      setChain(await api.auditVerify(admin.token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Chain verification failed");
    }
  }

  if (!admin.token) return null;

  return (
    <div className="space-y-6 px-0 py-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Every approve / reject decision, who made it and when.</p>
        </div>
        {logs.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 self-start sm:self-auto">
            {logs.length} Decisions
          </span>
        )}
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Tamper-evident hash-chained trail */}
      <Card className="border-indigo-100">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 size={16} className="text-indigo-600" /> Tamper-evident Trail
              </CardTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every audit entry links to the previous one (SHA-256 chain). Altering history breaks the chain.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={verify} className="gap-1.5">
              <ShieldCheck size={14} /> Verify chain
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {chain && (
            <p className={`rounded-lg border p-3 text-xs font-semibold ${
              chain.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              {chain.ok ? "✓ " : "✗ "}{chain.message} <span className="font-mono">({chain.algorithm})</span>
            </p>
          )}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5">Prev hash</th>
                  <th className="px-4 py-2.5">Entry hash</th>
                  <th className="px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trail.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-2.5 font-mono text-xs">{t.id}</td>
                    <td className="px-4 py-2.5 text-xs">{t.actor_email}<br />
                      <span className="text-slate-400 capitalize">{t.actor_role.replace(/_/g, " ")}</span></td>
                    <td className="px-4 py-2.5"><Badge variant="secondary">{t.action}</Badge></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{t.entity_type}:{t.entity_id}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{short(t.prev_hash)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{short(t.entry_hash)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trail.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No audit events yet — take any action and it lands here.</p>}
          </div>
          <ul className="sm:hidden divide-y divide-slate-100">
            {trail.map((t) => (
              <li key={t.id} className="py-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold">#{t.id} · {t.action}</span>
                  <span className="text-slate-500">{formatDate(t.created_at)}</span>
                </div>
                <p className="text-slate-500">{t.actor_email} · {t.entity_type}:{t.entity_id}</p>
                <p className="font-mono text-[10px] text-slate-400">⛓ {short(t.prev_hash)} → {short(t.entry_hash)}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decisions ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile card list — visible below sm */}
          <ul className="sm:hidden divide-y divide-slate-100">
            {logs.length === 0 && (
              <li className="p-6 text-center text-sm text-slate-500">No decisions logged yet.</li>
            )}
            {logs.map((l) => (
              <li key={l.id} className="flex flex-col gap-1.5 px-4 py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{l.admin_name ?? `Officer #${l.admin_id}`}</span>
                  <Badge variant={l.action === "Approved" ? "success" : "destructive"}>{l.action}</Badge>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="font-mono">App #{l.application_id}</span>
                  <span>·</span>
                  <span>{formatDate(l.created_at)}</span>
                </div>
                {l.remarks && <p className="text-slate-600 leading-snug">{l.remarks}</p>}
              </li>
            ))}
          </ul>

          {/* Desktop table — visible from sm up */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Officer</th>
                  <th className="px-4 py-2.5">Application</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-2.5 font-medium">{l.admin_name ?? `#${l.admin_id}`}</td>
                    <td className="px-4 py-2.5 font-mono">#{l.application_id}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={l.action === "Approved" ? "success" : "destructive"}>{l.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{l.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No decisions logged yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

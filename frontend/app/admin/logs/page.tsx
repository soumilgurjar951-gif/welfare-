"use client";

import { useEffect, useState } from "react";
import { ApiError, api, type AdminLog } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLogsPage() {
  const { admin } = useAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!admin.token) return;
    api
      .logs(admin.token)
      .then(setLogs)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load audit log"));
  }, [admin.token]);

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

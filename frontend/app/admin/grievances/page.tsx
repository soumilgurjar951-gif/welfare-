"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Reply } from "lucide-react";
import { ApiError, api, type Grievance } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FILTERS = ["all", "Open", "InReview", "Escalated", "Resolved", "Closed"];

/** Officer grievance triage — respond/resolve; SLA breaches auto-escalate on read. */
export default function OfficerGrievancesPage() {
  const { admin } = useAuth();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<Grievance[]>([]);
  const [reply, setReply] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!admin.token) return;
    try {
      setItems(await api.officerGrievances(admin.token, filter === "all" ? undefined : filter));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load grievances");
    }
  }, [admin.token, filter]);

  useEffect(() => { load(); }, [load]);
  if (!admin.token) return null;

  async function respond(id: number, resolve: boolean) {
    const text = (reply[id] ?? "").trim();
    if (text.length < 5) { setError("Response needs at least 5 characters."); return; }
    setBusy(id);
    setError("");
    try {
      await api.respondGrievance(admin.token!, id, text, resolve);
      setReply((r) => ({ ...r, [id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not respond");
    } finally {
      setBusy(null);
    }
  }

  const counts = {
    open: items.filter((g) => g.status === "Open").length,
    escalated: items.filter((g) => g.status === "Escalated").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <Inbox size={20} className="text-indigo-600" /> Grievance Redressal
        </h1>
        <div className="flex gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{counts.open} open</span>
          {counts.escalated > 0 && (
            <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-1 animate-pulse">
              {counts.escalated} escalated — SLA breached
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? "bg-indigo-600 text-white" : "bg-white border text-slate-600 hover:border-indigo-300"}`}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {items.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No grievances in this bucket.</p>}
        {items.map((g) => (
          <Card key={g.id} className={g.status === "Escalated" ? "border-red-300" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">#{g.id} · {g.subject}</CardTitle>
                  <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                    {g.citizen_name ?? "Citizen"} · {g.citizen_phone ?? ""} · {g.category.replace(/_/g, " ")} · filed {formatDate(g.created_at)} · SLA due {formatDate(g.sla_due)}
                  </p>
                </div>
                <Badge variant={g.status === "Escalated" ? "destructive" : g.status === "Resolved" || g.status === "Closed" ? "success" : "warning"}>
                  {g.status}{g.is_overdue && g.status !== "Resolved" && g.status !== "Closed" ? " · overdue" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {g.description && <p className="text-xs text-slate-600">{g.description}</p>}
              {g.officer_response && (
                <p className="text-xs rounded-lg bg-slate-50 border p-2.5">
                  <b>Earlier response{g.responded_by ? ` (${g.responded_by})` : ""}:</b> {g.officer_response}
                </p>
              )}
              {g.status !== "Closed" && g.status !== "Resolved" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={reply[g.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [g.id]: e.target.value }))}
                    placeholder="Officer response — min 5 chars…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy === g.id} onClick={() => respond(g.id, false)} className="gap-1.5">
                      <Reply size={13} /> Respond
                    </Button>
                    <Button size="sm" disabled={busy === g.id} onClick={() => respond(g.id, true)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

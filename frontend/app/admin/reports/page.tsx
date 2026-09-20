"use client";

import { useState } from "react";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { ApiError, api, type ActionMemo } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function ReportsPage() {
  const { admin } = useAuth();
  const [status, setStatus] = useState("");
  const [caseId, setCaseId] = useState("");
  const [memo, setMemo] = useState<ActionMemo | null>(null);
  const [error, setError] = useState("");
  if (!admin.token) return null;

  async function downloadCsv() {
    if (!admin.token) return;
    const res = await fetch(api.gapExportUrl({ status: status || undefined }),
      { headers: { Authorization: `Bearer ${admin.token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gap-cases.csv";
    a.click();
  }

  async function fetchMemo() {
    if (!admin.token || !caseId.trim()) return;
    setError("");
    setMemo(null);
    try {
      setMemo(await api.actionMemo(admin.token, Number(caseId.trim())));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Memo unavailable (case must be decided first)");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight">Reports & Memoranda</h1>
        <p className="text-xs text-slate-500">Role-based export · masked PII · watermarked · every export audited (PRD §5).</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Download size={15} /> Welfare-gap CSV export</CardTitle>
            <CardDescription className="text-xs">Masked, watermarked with your officer identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["Open", "Verified", "FalsePositive", "NeedsMoreData", "Closed"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Button size="sm" onClick={downloadCsv} className="gap-1.5">
              <Download size={14} /> Download masked CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><FileText size={15} /> Action memorandum</CardTitle>
            <CardDescription className="text-xs">Formal memo with decision reason + tracking code (decided cases only).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Gap case ID, e.g. 1" value={caseId} onChange={(e) => setCaseId(e.target.value)} />
              <Button size="sm" onClick={fetchMemo}>Generate</Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {memo && (
              <div className="rounded border p-3 text-xs space-y-2 bg-slate-50">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> {memo.subject}
                </p>
                <pre className="whitespace-pre-wrap font-sans">{memo.body}</pre>
                <p className="text-[11px] text-slate-500">Watermark: {memo.watermark}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

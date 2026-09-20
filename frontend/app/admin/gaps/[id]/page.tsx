"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, Flag, FileQuestion, FileText, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ApiError, api, type ActionMemo, type GapCase } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

export default function GapDossierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { admin } = useAuth();
  const [gap, setGap] = useState<GapCase | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [memo, setMemo] = useState<ActionMemo | null>(null);

  const load = useCallback(async () => {
    if (!admin.token || !id) return;
    try {
      setGap(await api.gapDetail(admin.token, Number(id)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load dossier");
    }
  }, [admin.token, id]);

  useEffect(() => { load(); }, [load]);
  if (!admin.token) return null;
  if (!gap) return <p className="text-xs text-slate-500">{error || "Loading dossier…"}</p>;

  const sig = (key: string): unknown =>
    (gap.eligibility_signals as Record<string, unknown> | null)?.[key];

  const anomalyText = (key: string): string => {
    const v = (gap.anomaly as Record<string, unknown> | null)?.[key];
    const s = v === null || v === undefined ? "" : String(v);
    return key === "type" ? (s || "—").replace(/_/g, " ") : s;
  };

  async function act(kind: "verify" | "fp" | "info") {
    if (!admin.token || !gap) return;
    if (reason.trim().length < 5) {
      setError("Decision reason mandatory (min 5 chars) — PRD human-in-the-loop rule.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = kind === "verify"
        ? await api.gapVerify(admin.token, gap.id, reason.trim())
        : kind === "fp"
          ? await api.gapFalsePositive(admin.token, gap.id, reason.trim())
          : await api.gapRequestInfo(admin.token, gap.id, reason.trim());
      setGap(updated);
      setReason("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadMemo() {
    if (!admin.token || !gap) return;
    try {
      setMemo(await api.actionMemo(admin.token, gap.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Memo unavailable");
    }
  }

  const decided = gap.status !== "Open";

  return (
    <div className="space-y-5">
      <Button size="sm" variant="outline" onClick={() => router.push("/admin/gaps")}>← Back to queue</Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Gap #{gap.id} — {gap.citizen_name}
            <Badge>{gap.label}</Badge>
            <Badge variant="outline">{gap.status}</Badge>
          </CardTitle>
          <CardDescription>
            {gap.scheme_name} · {gap.district} / {gap.block} / {gap.village} ·
            Priority {gap.priority} · Confidence {gap.confidence}% ·
            {gap.rule_version} / {gap.model_version}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="rounded bg-indigo-50 border border-indigo-100 p-3 text-slate-700">{gap.explanation}</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Matched records (evidence)</h3>
              <ul className="space-y-1.5">
                {(gap.evidence ?? []).map((e, i) => (
                  <li key={i} className="text-xs rounded border p-2">
                    <span className="font-bold">{e.source}</span> — {e.record}
                    <span className="text-slate-400"> · score {e.match_score}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Eligibility signals</h3>
              <dl className="text-xs rounded border divide-y">
                <SignalRow label="Land holding" value={`${sig("land_acres")} acres`} />
                <SignalRow label="Yearly income" value={`₹${Number(sig("income_yearly") ?? 0).toLocaleString("en-IN")}`} />
                <SignalRow label="Ration card" value={sig("has_ration_card") ? "Yes" : "No"} />
                <SignalRow label="Months since benefit" value={String(sig("months_since_benefit") ?? "—")} />
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <dt className="text-slate-500">Eligible by rules</dt>
                  <dd>
                    <Badge className={sig("eligible_by_rules") ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-slate-200 text-slate-600 border-slate-300"}>
                      {sig("eligible_by_rules") ? "Yes" : "No"}
                    </Badge>
                  </dd>
                </div>
              </dl>

              <h3 className="font-bold text-xs uppercase text-slate-500 mt-4 mb-2">Anomaly + root cause</h3>
              {gap.anomaly ? (
                <div className="text-xs rounded border border-amber-200 bg-amber-50 p-2.5 space-y-1">
                  <p><span className="font-bold">Type:</span> {anomalyText("type")}</p>
                  {anomalyText("detail") && (
                    <p><span className="font-bold">Detail:</span> {anomalyText("detail")}</p>
                  )}
                  {anomalyText("ifsc") && (
                    <p><span className="font-bold">IFSC:</span> {anomalyText("ifsc")}</p>
                  )}
                  {gap.root_cause && <p className="text-slate-700"><span className="font-bold">Root cause:</span> {gap.root_cause}</p>}
                </div>
              ) : (
                <p className="text-xs rounded border p-2.5 text-slate-500">No anomaly detected.</p>
              )}

              {(gap.top_factors ?? []).length > 0 && (
                <>
                  <h3 className="font-bold text-xs uppercase text-slate-500 mt-4 mb-2">Why this priority</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(gap.top_factors ?? []).map((f, i) => (
                      <Badge key={i} variant="outline" className="text-[11px]">{f}</Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Freshness: {gap.data_freshness ? formatDate(gap.data_freshness) : "—"} ·
            Provenance: {(gap.provenance?.sources ?? []).join(", ")} ·
            Limitations: {gap.limitations}
          </p>

          {gap.verification_history && gap.verification_history.length > 0 && (
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-500 mb-2">Verification history</h3>
              <ul className="space-y-1.5">
                {gap.verification_history.map((h, i) => (
                  <li key={i} className="text-xs rounded border p-2">
                    <span className="font-bold">{h.action}</span> by {h.by} ({h.role}) · {h.at}
                    <br />{h.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!decided ? (
            <div className="rounded border p-3 space-y-3 bg-white">
              <h3 className="font-bold text-xs uppercase text-slate-500">Officer decision (reason mandatory)</h3>
              <Input placeholder="Decision reason — min 5 chars…" value={reason}
                onChange={(e) => setReason(e.target.value)} />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => act("verify")} className="gap-1.5">
                  <ShieldCheck size={14} /> Verify
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act("fp")} className="gap-1.5">
                  <Flag size={14} /> False Positive
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act("info")} className="gap-1.5">
                  <FileQuestion size={14} /> Request Info
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs space-y-2">
              <p><span className="font-bold">Decision:</span> {gap.status} by {gap.decided_by}
                {gap.decided_at ? ` on ${formatDate(gap.decided_at)}` : ""}</p>
              <p><span className="font-bold">Reason:</span> {gap.decision_reason}</p>
              {gap.tracking_code && <p><span className="font-bold">Tracking:</span> {gap.tracking_code}</p>}
              <Button size="sm" variant="outline" onClick={loadMemo} className="gap-1.5">
                <FileText size={14} /> Generate Action Memorandum
              </Button>
              {memo && (
                <div className="space-y-2">
                  <pre className="whitespace-pre-wrap bg-white rounded border p-3 text-[11px]">
                    {memo.subject}{"\n\n"}{memo.body}{"\n\nWatermark: "}{memo.watermark}
                  </pre>
                  <div className="flex items-center gap-3 rounded border bg-white p-3">
                    <QRCodeSVG value={api.verifyUrlFor(memo.tracking_code)} size={96} />
                    <div className="text-[11px] text-slate-600">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <QrCode size={13} /> Scan to verify authenticity
                      </p>
                      <p className="mt-1 break-all font-mono">{api.verifyUrlFor(memo.tracking_code)}</p>
                      <p className="mt-1">Public page shows scheme + decision only — no citizen PII.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

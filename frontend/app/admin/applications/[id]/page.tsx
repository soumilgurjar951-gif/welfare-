"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, api, type ApplicationDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatINR, maskAadhaar } from "@/lib/utils";
import {
  approveSchema,
  rejectSchema,
  type ApproveInput,
  type RejectInput,
} from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";

export default function AdminApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { admin } = useAuth();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const approveForm = useForm<ApproveInput>({ resolver: zodResolver(approveSchema) });
  const rejectForm = useForm<RejectInput>({ resolver: zodResolver(rejectSchema) });

  const load = useCallback(async () => {
    if (!admin.token) return;
    try {
      setDetail(await api.adminDetail(admin.token, id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load application");
    }
  }, [admin.token, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!admin.token) return null;
  if (error) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  if (!detail) return <p className="text-sm text-slate-500">Loading application #{id}…</p>;

  const u = detail.user;
  const isPending = detail.status === "Pending";

  async function doApprove(v: ApproveInput) {
    if (!admin.token) return;
    setBusy(true);
    setActionMsg("");
    try {
      const updated = await api.approve(
        admin.token,
        id,
        v.benefit_amount ?? undefined,
        (v.remarks || "").trim() || undefined,
      );
      setDetail(updated);
      setActionMsg("Application approved and logged.");
    } catch (e) {
      setActionMsg(e instanceof ApiError ? e.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  async function doReject(v: RejectInput) {
    if (!admin.token) return;
    setBusy(true);
    setActionMsg("");
    try {
      const updated = await api.reject(
        admin.token,
        id,
        v.rejection_reason.trim(),
        (v.remarks || "").trim() || undefined,
      );
      setDetail(updated);
      setActionMsg("Application rejected and logged.");
    } catch (e) {
      setActionMsg(e instanceof ApiError ? e.message : "Rejection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">Application #{detail.id}</h1>
        <StatusBadge status={detail.status} />
      </div>

      {/* Full citizen details — Aadhaar always masked */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Citizen Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-medium">Name:</span> {u?.name ?? "—"}</p>
          <p><span className="font-medium">Aadhaar:</span> <span className="font-mono">{maskAadhaar(u?.aadhaar_masked)}</span></p>
          <p><span className="font-medium">Gov ID ({u?.id_type.toUpperCase()}):</span> {u?.other_gov_id ?? "—"}</p>
          <p><span className="font-medium">DOB:</span> {u?.dob ?? "—"}</p>
          <p><span className="font-medium">Phone:</span> {u?.phone ?? "—"}</p>
          <p><span className="font-medium">Email:</span> {u?.email ?? "—"}</p>
          <p className="sm:col-span-2"><span className="font-medium">Address:</span> {u?.address ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheme & Reason</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">Scheme:</span> {detail.scheme_name}</p>
          <p><span className="font-medium">Applied:</span> {formatDate(detail.created_at)}</p>
          <div>
            <p className="font-medium">Reason given by citizen</p>
            <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-slate-700">{detail.reason}</p>
          </div>
          {detail.documents.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Uploaded Documents ({detail.documents.length})</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.documents.map((d) => (
                  <a
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs hover:border-indigo-300 hover:bg-indigo-50/50 transition group"
                    href={api.uploadUrl(d.file_path)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="font-medium text-slate-800 group-hover:text-indigo-600 truncate">{d.file_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{(d.file_size / 1024).toFixed(0)} KB</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {!isPending && (
            <div className="rounded-md bg-slate-50 p-3">
              <p><span className="font-medium">Decision:</span> {detail.status} by {detail.admin_name ?? "officer"}{detail.decided_at ? ` on ${formatDate(detail.decided_at)}` : ""}</p>
              {detail.benefit_amount && <p><span className="font-medium">Benefit:</span> {formatINR(detail.benefit_amount)}</p>}
              {detail.rejection_reason && <p><span className="font-medium">Rejection reason:</span> {detail.rejection_reason}</p>}
              {detail.remarks && <p><span className="font-medium">Remarks:</span> {detail.remarks}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {actionMsg && <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{actionMsg}</p>}

      {isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-base text-green-800">Approve — grant the benefit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={approveForm.handleSubmit(doApprove)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Benefit amount (₹, optional)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="e.g. 50000" {...approveForm.register("benefit_amount")} />
                  {approveForm.formState.errors.benefit_amount && (
                    <p className="text-xs text-red-600">{approveForm.formState.errors.benefit_amount.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Remarks (optional)</Label>
                  <Textarea placeholder="Verification notes…" {...approveForm.register("remarks")} />
                </div>
                <Button type="submit" variant="success" disabled={busy}>
                  {busy ? "Working…" : "Approve Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-800">Reject with reason</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={rejectForm.handleSubmit(doReject)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Rejection reason (mandatory)</Label>
                  <Textarea placeholder="Why is this application rejected?…" {...rejectForm.register("rejection_reason")} />
                  {rejectForm.formState.errors.rejection_reason && (
                    <p className="text-xs text-red-600">{rejectForm.formState.errors.rejection_reason.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Internal remarks (optional)</Label>
                  <Textarea placeholder="Notes for the audit log…" {...rejectForm.register("remarks")} />
                </div>
                <Button type="submit" variant="destructive" disabled={busy}>
                  {busy ? "Working…" : "Reject Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Button variant="outline" onClick={() => router.push("/admin/applications")}>
          Back to applications
        </Button>
      )}
    </div>
  );
}

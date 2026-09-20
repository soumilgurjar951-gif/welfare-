"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { ApiError, api, type MemoVerification } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Public memorandum verification — landing page for memo QR codes (no login). */
export default function VerifyMemoPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code ?? "");
  const [data, setData] = useState<MemoVerification | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    api.verifyMemo(code)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Verification failed"));
  }, [code]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600" />
        <CardHeader className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white">
            <ShieldCheck size={24} />
          </span>
          <CardTitle className="text-lg mt-2">Memorandum Verification</CardTitle>
          <p className="font-mono text-xs text-slate-500">{code}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <ShieldAlert size={28} className="mx-auto text-red-500" />
              <p className="mt-2 font-bold text-red-700">Not verified</p>
              <p className="text-xs text-red-600 mt-1">{error}. Check the code or contact the district office.</p>
            </div>
          )}
          {data && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <BadgeCheck size={28} className="mx-auto text-emerald-600" />
                <p className="mt-2 font-extrabold text-emerald-700">Genuine memorandum ✓</p>
                <p className="text-xs text-emerald-700 mt-1">{data.message}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Scheme", data.scheme ?? "—"],
                  ["Decision", data.status ?? "—"],
                  ["AI label", data.ai_label ?? "—"],
                  ["District", data.district ?? "—"],
                  ["Decided on", data.decided_at ? formatDate(data.decided_at) : "—"],
                  ["Issued by", data.issued_by_masked ?? "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 border px-3 py-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-bold text-slate-800 mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-slate-500 text-center">
                Citizen names and Aadhaar details are never shown on public verification (DPDP Act 2023).
              </p>
            </div>
          )}
          {!data && !error && <p className="text-center text-xs text-slate-500">Verifying…</p>}
          <div className="mt-5 text-center">
            <Link href="/admin/login" className="text-xs font-bold text-indigo-600 hover:underline">
              Officer sign-in →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, api, type Scheme } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { applySchema, type ApplyInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  X,
  File,
  Layers,
  CheckSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt";

export default function ApplyPage() {
  const params = useParams<{ schemeId: string }>();
  const schemeId = Number(params.schemeId);
  const router = useRouter();
  const { citizen, ready } = useAuth();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplyInput>({ resolver: zodResolver(applySchema) });

  useEffect(() => {
    if (schemeId) {
      api.scheme(schemeId).then(setScheme).catch(() => {});
    }
  }, [schemeId]);

  async function onSubmit(values: ApplyInput) {
    if (!citizen.token) {
      router.push("/login");
      return;
    }
    setServerError("");
    try {
      const app = await api.apply(citizen.token, schemeId, values.reason.trim(), files);
      router.push(`/applications/${app.id}`);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Application submission failed. Please try again.");
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!ready) {
    return (
      <div className="mx-auto max-w-xl p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        Loading application form…
      </div>
    );
  }

  if (!citizen.token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Authentication Required</h2>
        <p className="text-sm text-slate-600">Please log in to your citizen account to apply for Scheme #{schemeId}.</p>
        <a href="/login" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition">
          Go to Login <ArrowRight size={14} />
        </a>
      </div>
    );
  }

  const reqDocList: string[] = Array.isArray(scheme?.required_documents)
    ? scheme.required_documents
    : typeof scheme?.required_documents === "string"
    ? scheme.required_documents.split(",").map((d: string) => d.trim())
    : ["Aadhaar Card", "Income Certificate", "Active Bank Passbook"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-16 space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
            1
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-900">{scheme?.name ?? `Scheme #${schemeId}`}</h3>
            <p className="text-[11px] text-slate-500">Government Welfare Scheme Application</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          <ShieldCheck size={14} /> Aadhaar Verified
        </div>
      </div>

      {/* Scheme Required Documents Checklist Callout Box */}
      <Card className="border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-indigo-900 flex items-center gap-2">
            <CheckSquare size={16} className="text-indigo-600" /> Mandatory Documents Required for {scheme?.name ?? "this Scheme"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Verification Officers check the following documents for approval:
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid gap-2 sm:grid-cols-2">
            {reqDocList.map((docName: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 rounded-xl bg-white p-2.5 text-xs font-semibold text-slate-800 border border-indigo-100/80 shadow-2xs">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{docName}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200/80 shadow-md bg-white overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500" />
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Apply for {scheme?.name ?? `Scheme #${schemeId}`}</CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Explain your situation and attach the required supporting documents above (PDF / Images, max 10MB each).
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Reason for Application <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="reason"
                rows={4}
                placeholder="Describe your family background, financial status, and why you are applying for this benefit..."
                className="text-xs sm:text-sm rounded-xl border-slate-200 focus:border-indigo-500"
                {...register("reason")}
              />
              {errors.reason && <p className="text-xs font-medium text-rose-600">{errors.reason.message}</p>}
            </div>

            {/* Drag & Drop Styled File Upload */}
            <div className="space-y-2">
              <Label htmlFor="files" className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Supporting Documents (Optional)
              </Label>
              <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center hover:border-indigo-400 transition">
                <Input
                  id="files"
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    setFiles((prev) => [...prev, ...selected].slice(0, 5));
                  }}
                />
                <div className="space-y-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Upload size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PDF, JPG, PNG, DOC (max 5 files, 10MB per file)</p>
                  </div>
                </div>
              </div>

              {/* Uploaded File List Preview */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-slate-700">Attached Files ({files.length}/5):</p>
                  <ul className="space-y-2">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 text-xs border border-slate-200/60">
                        <div className="flex items-center gap-2 truncate">
                          <File size={16} className="text-indigo-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-500">({(f.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {serverError && (
              <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition"
            >
              {isSubmitting ? "Submitting Application…" : "Submit Application Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


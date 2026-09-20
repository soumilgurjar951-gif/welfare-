"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { ApiError, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin, adminMfaVerify } = useAuth();
  const [serverError, setServerError] = useState("");
  const [preToken, setPreToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  async function onSubmit(values: AdminLoginInput) {
    setServerError("");
    try {
      const res = await adminLogin(values.email.trim(), values.password);
      if (res.mfaRequired) {
        // Password OK — now the TOTP second factor.
        setPreToken(res.preToken);
        return;
      }
      router.push("/admin/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Admin login failed.";
      // Surface CORS/network hints helpfully
      if (/Failed to fetch|Load failed|NetworkError|CORS/i.test(msg)) {
        setServerError(`Cannot reach API at ${API_BASE}. Is the backend running and CORS allowed? (${msg})`);
      } else {
        setServerError(msg);
      }
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!preToken) return;
    setVerifying(true);
    setServerError("");
    try {
      await adminMfaVerify(preToken, otp.trim().replace(/\s/g, ""));
      router.push("/admin/dashboard");
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Invalid authenticator code.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <ShieldCheck size={24} />
          </span>
          <CardTitle>Officer Login</CardTitle>
          <CardDescription>
            Restricted area — only accounts with the <strong>admin</strong> role can sign in here.
            Default seed admin: <code>admin@gov.in</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preToken ? (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
                Password accepted. Enter the 6-digit code from your authenticator app
                (Google Authenticator / Authy) to finish sign-in.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="otp">Authenticator code</Label>
                <Input id="otp" inputMode="numeric" autoComplete="one-time-code" autoFocus
                  placeholder="123 456" value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl font-mono tracking-[0.3em]" maxLength={9} />
              </div>
              {serverError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{serverError}</p>}
              <Button type="submit" className="w-full" disabled={verifying || otp.trim().length < 6}>
                {verifying ? "Verifying…" : "Verify & Sign In"}
              </Button>
              <button type="button" onClick={() => { setPreToken(null); setOtp(""); setServerError(""); }}
                className="w-full text-xs text-slate-500 hover:text-slate-800">
                ← Back to password
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Official Email</Label>
              <Input id="email" type="email" placeholder="officer@gov.in" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {serverError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Login to Admin Panel"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

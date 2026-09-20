"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, QrCode, ShieldCheck, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Officer MFA enrolment — TOTP via any authenticator app (CERT-In control). */
export default function SecurityPage() {
  const { admin } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [uri, setUri] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!admin.token) return;
    try {
      const s = await api.mfaStatus(admin.token);
      setEnabled(s.enabled);
      // Keep the layout badge (role line) in sync without a full reload.
      if (admin.user) admin.user.mfa_enabled = s.enabled;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load MFA status");
    }
  }, [admin.token, admin.user]);

  useEffect(() => { load(); }, [load]);
  if (!admin.token) return null;

  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await api.mfaSetup(admin.token!);
      setUri(r.otpauth_uri);
      setSecret(r.manual_secret);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api.mfaEnable(admin.token!, code.trim().replace(/\s/g, ""));
      setUri(""); setSecret(""); setCode("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      await api.mfaDisable(admin.token!, password);
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not disable MFA");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
        <KeyRound size={20} className="text-indigo-600" /> Two-Factor Authentication
      </h1>
      <p className="text-xs text-slate-500">
        CERT-In control — every officer account must sign in with password + a 6-digit
        authenticator code. Secrets never leave the server except as your personal QR.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Status:
            {enabled === null ? (
              <span className="text-slate-400">loading…</span>
            ) : enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                <ShieldCheck size={13} /> Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                <ShieldOff size={13} /> Disabled — non-compliant
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          {!enabled && !uri && (
            <div>
              <p className="text-xs text-slate-600 mb-2">
                1. Install Google Authenticator / Authy / any TOTP app. 2. Click below to get your QR.
              </p>
              <Button onClick={start} disabled={busy} className="gap-2">
                <QrCode size={15} /> {busy ? "Generating…" : "Start enrolment"}
              </Button>
            </div>
          )}

          {!enabled && uri && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border p-4 bg-white">
                <QRCodeSVG value={uri} size={160} />
                <div className="text-xs text-slate-600 space-y-1.5">
                  <p className="font-bold text-slate-800">Scan with your authenticator app, then enter the 6-digit code:</p>
                  <p>Can&apos;t scan? Enter this secret manually:</p>
                  <code className="block break-all rounded bg-slate-100 px-2 py-1 font-mono text-[11px]">{secret}</code>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mfa-code">6-digit code from the app</Label>
                <Input id="mfa-code" inputMode="numeric" placeholder="123 456" value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-xl font-mono tracking-[0.25em]" maxLength={9} />
              </div>
              <Button onClick={confirm} disabled={busy || code.trim().length < 6}>Confirm & enable MFA</Button>
            </div>
          )}

          {enabled && (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="text-xs text-slate-600">
                MFA protects this account. Next sign-in will ask for password + authenticator code.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="mfa-pass">Confirm password to disable (audited)</Label>
                <Input id="mfa-pass" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className="max-w-xs" />
              </div>
              <Button variant="outline" onClick={disable} disabled={busy || !password}>
                Disable MFA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

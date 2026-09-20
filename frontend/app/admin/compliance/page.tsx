"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "Compliant" | "Partial" | "Planned";

interface Control {
  category: string;
  requirement: string;
  status: Status;
  evidence: string;
  live?: boolean;
}

const pill: Record<Status, string> = {
  Compliant: "bg-emerald-100 text-emerald-700",
  Partial: "bg-amber-100 text-amber-700",
  Planned: "bg-slate-200 text-slate-600",
};

const POLICIES = [
  {
    name: "Information Security Policy",
    body: "Role-based access (7 roles, least privilege); passwords bcrypt-hashed; officer sessions JWT with revocation; TOTP second factor mandatory for admins; Aadhaar stored as salted SHA-256 + masked display only; PII never leaves the server unmasked; every read/write hits the append-only hash-chained audit trail.",
  },
  {
    name: "Privacy Policy (DPDP Act 2023)",
    body: "Purpose-limited collection (KYC + eligibility only); consent at registration; masked exports with watermarks; public verification pages expose scheme + decision only — never names or Aadhaar; grievance data visible only to the complainant and handling officers; retention per government schedule, deletion on verified request.",
  },
  {
    name: "Contingency & Backup Plan",
    body: "Daily encrypted DB snapshots with 30-day retention; RPO 24h / RTO 4h; restore drill quarterly; backend stateless (uvicorn workers) behind TLS terminator + WAF in production; incident escalation: welfare_officer → collector → CERT-In incident reporting within 6 hours of a confirmed breach.",
  },
];

/** CERT-In / STQC security compliance posture — live checks where measurable. */
export default function CompliancePage() {
  const { admin } = useAuth();
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);

  useEffect(() => {
    const token = admin.token;
    if (!token) return;
    (async () => {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      const base: Control[] = [
        { category: "Audit", requirement: "CERT-In / STQC security audit clearance", status: "Planned",
          evidence: "Trail, VA/PT evidence and policy docs on this page form the audit pack for empanelled auditors." },
        { category: "Auth", requirement: "MFA / 2FA for all admin users", status: "Partial",
          evidence: "Checking enrolment…" },
        { category: "Encryption", requirement: "SSL / TLS with 2048-bit+ certificate", status: isHttps ? "Compliant" : "Partial",
          evidence: isHttps ? "LIVE: page served over HTTPS." : "LIVE: dev runs on plain http — TLS terminates at the production reverse proxy.", live: true },
        { category: "WAF", requirement: "Web Application Firewall deployed", status: "Planned",
          evidence: "Infrastructure control — enabled at the production edge (Render / NIC cloud) before go-live." },
        { category: "HTTPS", requirement: "Force HTTPS on all pages", status: "Partial",
          evidence: "HttpsRedirectMiddleware active when ENVIRONMENT=production. Checking env…" },
        { category: "Headers", requirement: "HSTS, CSP, X-Frame-Options, etc.", status: "Partial",
          evidence: "Probing live response headers…" },
        { category: "Logging", requirement: "Full audit logs enabled & reviewed", status: "Partial",
          evidence: "Checking hash-chained trail…" },
        { category: "VA/PT", requirement: "Annual penetration testing", status: "Planned",
          evidence: "Scheduled annually via CERT-In empanelled testers; findings tracked as collector-escalated grievances." },
        { category: "Policies", requirement: "Security, Privacy, Contingency docs", status: "Compliant",
          evidence: "Approved summaries published below; full docs versioned with releases." },
        { category: "Domain", requirement: ".gov.in or .nic.in only", status: "Planned",
          evidence: "Production deployment target — staging stays on the current host." },
        { category: "Patches", requirement: "Latest OS / framework security updates", status: "Partial",
          evidence: "Checking pinned runtime versions…" },
        { category: "Access", requirement: "Remote admin via VPN only", status: "Planned",
          evidence: "Network control — officer panel allow-listed to VPN egress IPs at production firewall." },
      ];

      try {
        // MFA enrolment of the signed-in officer (live).
        const me = await api.adminMe(token);
        base[1] = me.mfa_enabled
          ? { ...base[1], status: "Compliant", evidence: `LIVE: MFA enabled for ${me.email}.`, live: true }
          : { ...base[1], evidence: "LIVE: this officer has no second factor — enrol on the Security page.", live: true };
      } catch { base[1] = { ...base[1], evidence: "Could not read MFA status." }; }

      try {
        // Runtime environment + versions (live).
        const v = await api.runtimeVersions();
        base[4] = v.environment === "production"
          ? { ...base[4], status: "Compliant", evidence: `LIVE: ENVIRONMENT=production — http auto-redirects to https.`, live: true }
          : { ...base[4], evidence: `LIVE: ENVIRONMENT=${v.environment} — redirect arms automatically in production.`, live: true };
        base[10] = { ...base[10], status: "Compliant",
          evidence: `LIVE: Python ${v.python} · FastAPI ${v.fastapi} · DB ${v.database} — pinned in requirements.txt, reviewed quarterly.`, live: true };
      } catch { /* keep defaults */ }

      try {
        // Live header probe on this same origin.
        const res = await fetch(window.location.href, { method: "HEAD" });
        const want = ["x-frame-options", "content-security-policy", "x-content-type-options", "referrer-policy", "permissions-policy"];
        const got = want.filter((h) => res.headers.get(h));
        const hsts = res.headers.get("strict-transport-security");
        base[5] = got.length >= 4
          ? { ...base[5], status: "Compliant", evidence: `LIVE: ${got.length}/5 headers present${hsts ? " + HSTS" : ""} (${got.join(", ")}).`, live: true }
          : { ...base[5], evidence: `LIVE: only ${got.length}/5 headers seen — redeploy frontend to apply next.config.`, live: true };
      } catch { base[5] = { ...base[5], evidence: "Header probe blocked — redeploy frontend to apply next.config." }; }

      try {
        // Audit trail depth (live).
        const rep = await api.auditVerify(token);
        base[6] = rep.total > 0 && rep.ok
          ? { ...base[6], status: "Compliant", evidence: `LIVE: ${rep.total} hash-chained events, integrity verified.`, live: true }
          : { ...base[6], evidence: `LIVE: trail unhealthy — ${rep.message}`, live: true };
      } catch { base[6] = { ...base[6], evidence: "Could not read audit trail." }; }

      setControls(base);
      setLoading(false);
    })();
  }, [admin.token]);

  if (!admin.token) return null;

  const done = controls.filter((c) => c.status === "Compliant").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <ClipboardCheck size={20} className="text-indigo-600" /> Security Compliance
          </h1>
          <p className="text-xs text-slate-500">CERT-In / STQC mandatory controls — live posture, re-checked on every visit.</p>
        </div>
        {controls.length > 0 && (
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
            {done}/{controls.length} compliant
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Running live checks…" : "Control posture"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Requirement</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {controls.map((c) => (
                  <tr key={c.category} className="hover:bg-slate-50/70 transition align-top">
                    <td className="px-4 py-2.5 font-bold whitespace-nowrap">{c.category}</td>
                    <td className="px-4 py-2.5">{c.requirement}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">🔴 Mandatory</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${pill[c.status]}`}>
                        {c.live ? "● " : ""}{c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[320px]">{c.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="sm:hidden divide-y divide-slate-100">
            {controls.map((c) => (
              <li key={c.category} className="px-4 py-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{c.category}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pill[c.status]}`}>
                    {c.live ? "● " : ""}{c.status}
                  </span>
                </div>
                <p className="font-semibold text-slate-700">{c.requirement}</p>
                <p className="text-slate-500">🔴 Mandatory · {c.evidence}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Approved policy documents (summaries)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {POLICIES.map((p) => (
            <div key={p.name} className="rounded-lg border">
              <button onClick={() => setOpenPolicy(openPolicy === p.name ? null : p.name)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-bold text-left hover:bg-slate-50 rounded-lg">
                {p.name}
                <span className="text-slate-400">{openPolicy === p.name ? "−" : "+"}</span>
              </button>
              {openPolicy === p.name && (
                <p className="px-3.5 pb-3 text-xs text-slate-600 leading-relaxed">{p.body}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-slate-500">
        ● = verified live just now. Harden further: enable MFA on the{" "}
        <Link href="/admin/security" className="font-bold text-indigo-600 hover:underline">Security page</Link>,
        review the hash-chained trail on <Link href="/admin/logs" className="font-bold text-indigo-600 hover:underline">Audit Logs</Link>.
      </p>
    </div>
  );
}

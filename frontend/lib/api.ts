/** Typed API client for the Scheme Sync FastAPI backend. */

const _rawBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
// Auto-migrate old welfare--1 URL → welfare-2 (backend was recreated on Render)
export const API_BASE = _rawBase.replace("welfare--1.onrender.com", "welfare-2.onrender.com");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.join("\n");
  }
  return fallback;
}

/* ─────────────────────────────────────────────────────────────────────────────
   In-memory GET cache — avoids redundant round-trips on same-session navigation.
   Only public / token-less endpoints and safe per-token reads are cached.
   Cache entries expire after `ttl` ms.  Mutating calls (POST/PATCH) bust
   matching cache keys so data stays fresh after writes.
───────────────────────────────────────────────────────────────────────────── */
interface CacheEntry<T> { data: T; expires: number }
const _cache = new Map<string, CacheEntry<unknown>>();
const TTL_SHORT = 15_000;   // 15 s  — user-specific data (applications, profile)
const TTL_LONG = 120_000;  // 2 min — quasi-static data (schemes list)

function cacheGet<T>(key: string): T | undefined {
  const entry = _cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expires) { _cache.delete(key); return undefined; }
  return entry.data;
}
function cacheSet<T>(key: string, data: T, ttl: number) {
  _cache.set(key, { data, expires: Date.now() + ttl });
}
function cacheBust(prefix: string) {
  for (const k of Array.from(_cache.keys())) { if (k.startsWith(prefix)) _cache.delete(k); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Core fetch wrapper — supports AbortSignal so callers can cancel on unmount.
───────────────────────────────────────────────────────────────────────────── */
async function request<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    json?: unknown;
    form?: FormData;
    signal?: AbortSignal;
    /** If set, responses are cached under this key with the given TTL (ms). */
    cacheKey?: string;
    cacheTtl?: number;
  } = {},
): Promise<T> {
  // Return cached value for GET reads when available
  if (opts.cacheKey && (!opts.method || opts.method === "GET")) {
    const hit = cacheGet<T>(opts.cacheKey);
    if (hit !== undefined) return hit;
  }

  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, `Request failed (${res.status})`));

  const result = data as T;
  if (opts.cacheKey && (!opts.method || opts.method === "GET")) {
    cacheSet(opts.cacheKey, result, opts.cacheTtl ?? TTL_SHORT);
  }
  return result;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Types (mirror backend schemas)
───────────────────────────────────────────────────────────────────────────── */
export interface User {
  id: number;
  name: string;
  id_type: string;
  aadhaar_masked: string | null;
  other_gov_id: string | null;
  phone: string;
  email: string;
  address: string;
  dob: string;
  role: string;
  mfa_enabled?: boolean;
  created_at: string;
}

export interface Scheme {
  id: number;
  name: string;
  description: string;
  eligibility: string;
  is_active: boolean;
  created_at: string;
  required_documents?: string | string[] | null;
}

export interface Document {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_at: string;
}

export interface Application {
  id: number;
  user_id: number;
  scheme_id: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  rejection_reason: string | null;
  benefit_amount: string | null;
  remarks: string | null;
  admin_id: number | null;
  decided_at: string | null;
  created_at: string;
  scheme_name: string | null;
  documents: Document[];
}

export interface ApplicationDetail extends Application {
  user: User | null;
  admin_name: string | null;
}

export interface AdminRow {
  id: number;
  citizen_name: string;
  aadhaar_masked: string | null;
  other_gov_id: string | null;
  scheme_name: string;
  scheme_id: number;
  status: string;
  created_at: string;
  decided_at: string | null;
}

export interface PagedApplications {
  total: number;
  page: number;
  page_size: number;
  items: AdminRow[];
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_disbursed: number;
}

export interface AdminLog {
  id: number;
  admin_id: number;
  application_id: number;
  action: string;
  remarks: string | null;
  created_at: string;
  admin_name: string | null;
}

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  channel: string;
  recipient: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  unread_count: number;
  items: AppNotification[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   API surface
───────────────────────────────────────────────────────────────────────────── */
export const api = {
  /* ── Auth ── */
  register: (json: unknown) => request<User>("/api/auth/register", { method: "POST", json }),
  login: (identifier: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      json: { identifier, password },
    }),
  adminLogin: (email: string, password: string) =>
    request<{ mfa_required: boolean; access_token: string | null; pre_token: string | null }>(
      "/api/auth/admin/login", { method: "POST", json: { email, password } },
    ),
  /* ── Officer MFA (TOTP second factor) ── */
  mfaSetup: (token: string) =>
    request<{ otpauth_uri: string; manual_secret: string; issuer: string }>(
      "/api/auth/admin/mfa/setup", { method: "POST", token },
    ),
  mfaEnable: (token: string, code: string) =>
    request<{ enabled: boolean }>("/api/auth/admin/mfa/enable", { method: "POST", token, json: { code } }),
  mfaDisable: (token: string, password: string) =>
    request<{ enabled: boolean }>("/api/auth/admin/mfa/disable", { method: "POST", token, json: { password } }),
  mfaStatus: (token: string, signal?: AbortSignal) =>
    request<{ enabled: boolean }>("/api/auth/admin/mfa/status", { token, signal }),
  mfaVerify: (preToken: string, code: string) =>
    request<{ access_token: string }>("/api/auth/admin/mfa/verify", {
      method: "POST", json: { pre_token: preToken, code },
    }),
  me: (token: string, signal?: AbortSignal) =>
    request<User>("/api/auth/me", { token, signal, cacheKey: `me:${token}`, cacheTtl: TTL_SHORT }),
  adminMe: (token: string, signal?: AbortSignal) =>
    request<User>("/api/auth/admin/me", { token, signal, cacheKey: `adminMe:${token}`, cacheTtl: TTL_SHORT }),

  /* ── Notifications ── */
  myNotifications: (token: string, signal?: AbortSignal) =>
    request<NotificationsResponse>("/api/notifications", {
      token, signal,
      cacheKey: `notifs:${token}`, cacheTtl: TTL_SHORT,
    }),
  markNotificationRead: (token: string, id: number) => {
    cacheBust(`notifs:${token}`);
    return request<AppNotification>(`/api/notifications/${id}/read`, { method: "PATCH", token });
  },
  markAllNotificationsRead: (token: string) => {
    cacheBust(`notifs:${token}`);
    return request<{ message: string }>("/api/notifications/mark-all-read", { method: "POST", token });
  },

  /* ── Public transparency (no auth) ── */
  publicStats: (signal?: AbortSignal) =>
    request<{ total_applications: number; approved: number; total_disbursed: number; active_schemes: number }>(
      "/api/stats/public",
      { signal, cacheKey: "publicStats", cacheTtl: TTL_SHORT },
    ),
  runtimeVersions: (signal?: AbortSignal) =>
    request<{ service: string; api_version: string; environment: string; python: string; fastapi: string; interpreter: string; database: string }>(
      "/api/stats/version", { signal },
    ),

  /* ── Citizen ── */
  schemes: (signal?: AbortSignal) =>
    request<Scheme[]>("/api/schemes", {
      signal, cacheKey: "schemes", cacheTtl: TTL_LONG,
    }),
  scheme: (id: number, signal?: AbortSignal) =>
    request<Scheme>(`/api/schemes/${id}`, {
      signal, cacheKey: `scheme:${id}`, cacheTtl: TTL_LONG,
    }),
  apply: (token: string, schemeId: number, reason: string, files: File[]) => {
    cacheBust(`myApps:`);
    const form = new FormData();
    form.append("scheme_id", String(schemeId));
    form.append("reason", reason);
    for (const f of files) form.append("files", f);
    return request<Application>("/api/applications", { method: "POST", token, form });
  },
  myApplications: (token: string, signal?: AbortSignal) =>
    request<Application[]>("/api/applications/me", {
      token, signal,
      cacheKey: `myApps:${token}`, cacheTtl: TTL_SHORT,
    }),
  myApplication: (token: string, id: number, signal?: AbortSignal) =>
    request<Application>(`/api/applications/${id}`, {
      token, signal,
      cacheKey: `myApp:${token}:${id}`, cacheTtl: TTL_SHORT,
    }),
  myProfile: (token: string) => request<User>("/api/users/me", { token }),
  updateProfile: (token: string, json: { name?: string; phone?: string; address?: string }) => {
    cacheBust(`me:${token}`);
    return request<User>("/api/users/me", { method: "PATCH", token, json });
  },

  /* ── Admin ── */
  stats: (token: string, signal?: AbortSignal) =>
    request<DashboardStats>("/api/admin/stats", {
      token, signal, cacheKey: `stats:${token}`, cacheTtl: TTL_SHORT,
    }),
  adminApplications: (
    token: string,
    params: { status?: string; scheme_id?: number; search?: string; page?: number; page_size?: number },
    signal?: AbortSignal,
  ) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.scheme_id) q.set("scheme_id", String(params.scheme_id));
    if (params.search) q.set("search", params.search);
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 20));
    const qs = q.toString();
    return request<PagedApplications>(`/api/admin/applications?${qs}`, {
      token, signal,
      cacheKey: `adminApps:${token}:${qs}`, cacheTtl: TTL_SHORT,
    });
  },
  adminDetail: (token: string, id: number, signal?: AbortSignal) =>
    request<ApplicationDetail>(`/api/admin/applications/${id}`, {
      token, signal,
      cacheKey: `adminApp:${token}:${id}`, cacheTtl: TTL_SHORT,
    }),
  approve: (token: string, id: number, benefit_amount?: number, remarks?: string) => {
    cacheBust(`adminApp:${token}:${id}`);
    cacheBust(`adminApps:${token}`);
    cacheBust(`stats:${token}`);
    return request<ApplicationDetail>(`/api/admin/applications/${id}/approve`, {
      method: "POST", token,
      json: { benefit_amount: benefit_amount ?? null, remarks: remarks ?? null },
    });
  },
  reject: (token: string, id: number, rejection_reason: string, remarks?: string) => {
    cacheBust(`adminApp:${token}:${id}`);
    cacheBust(`adminApps:${token}`);
    cacheBust(`stats:${token}`);
    return request<ApplicationDetail>(`/api/admin/applications/${id}/reject`, {
      method: "POST", token,
      json: { rejection_reason, remarks: remarks ?? null },
    });
  },
  logs: (token: string, signal?: AbortSignal) =>
    request<AdminLog[]>("/api/admin/logs", {
      token, signal, cacheKey: `logs:${token}`, cacheTtl: TTL_SHORT,
    }),
  adminSchemes: (token: string, signal?: AbortSignal) =>
    request<{ id: number; name: string; is_active: boolean }[]>("/api/admin/schemes", {
      token, signal, cacheKey: `adminSchemes:${token}`, cacheTtl: TTL_LONG,
    }),
  exportUrl: (params: { status?: string; scheme_id?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.scheme_id) q.set("scheme_id", String(params.scheme_id));
    if (params.search) q.set("search", params.search);
    return `${API_BASE}/api/admin/applications/export?${q.toString()}`;
  },
  uploadUrl: (filePath: string) => `${API_BASE}/${filePath.replace(/^\//, "")}`,

  /* ── PRD: Gap Cases (AI flags; officers decide) ── */
  gapCases: (
    token: string,
    params: { label?: string; status?: string; district?: string; min_priority?: number; search?: string; page?: number; page_size?: number },
    signal?: AbortSignal,
  ) => {
    const q = new URLSearchParams();
    if (params.label) q.set("label", params.label);
    if (params.status) q.set("status", params.status);
    if (params.district) q.set("district", params.district);
    if (params.min_priority !== undefined) q.set("min_priority", String(params.min_priority));
    if (params.search) q.set("search", params.search);
    q.set("page", String(params.page ?? 1));
    q.set("page_size", String(params.page_size ?? 20));
    const qs = q.toString();
    return request<PagedGaps>(`/api/gap-cases?${qs}`, {
      token, signal, cacheKey: `gaps:${token}:${qs}`, cacheTtl: TTL_SHORT,
    });
  },
  gapDetail: (token: string, id: number, signal?: AbortSignal) =>
    request<GapCase>(`/api/gap-cases/${id}`, {
      token, signal, cacheKey: `gap:${token}:${id}`, cacheTtl: TTL_SHORT,
    }),
  gapVerify: (token: string, id: number, decision_reason: string, assignment?: string) => {
    cacheBust(`gap:${token}:${id}`); cacheBust(`gaps:${token}`);
    return request<GapCase>(`/api/gap-cases/${id}/verify`, {
      method: "POST", token, json: { decision_reason, assignment: assignment ?? null },
    });
  },
  gapFalsePositive: (token: string, id: number, decision_reason: string) => {
    cacheBust(`gap:${token}:${id}`); cacheBust(`gaps:${token}`);
    return request<GapCase>(`/api/gap-cases/${id}/false-positive`, {
      method: "POST", token, json: { decision_reason },
    });
  },
  gapRequestInfo: (token: string, id: number, decision_reason: string, assignment?: string) => {
    cacheBust(`gap:${token}:${id}`); cacheBust(`gaps:${token}`);
    return request<GapCase>(`/api/gap-cases/${id}/request-info`, {
      method: "POST", token, json: { decision_reason, assignment: assignment ?? null },
    });
  },

  /* ── PRD: Analytics + Demo + Reports ── */
  analyticsSummary: (token: string, signal?: AbortSignal) =>
    request<AnalyticsSummary>(`/api/analytics/summary`, {
      token, signal, cacheKey: `analytics:${token}`, cacheTtl: TTL_SHORT,
    }),
  analyticsGeography: (token: string, signal?: AbortSignal) =>
    request<{ villages: { village: string; gaps: number; max_priority: number; level: string }[] }>(
      `/api/analytics/geography`, { token, signal, cacheKey: `geo:${token}`, cacheTtl: TTL_SHORT },
    ),
  demoWalkthrough: (token: string, signal?: AbortSignal) =>
    request<DemoStep[]>(`/api/demo/walkthrough`, {
      token, signal, cacheKey: `demo:${token}`, cacheTtl: TTL_SHORT,
    }),
  demoRun: (token: string) => {
    cacheBust(`gaps:${token}`); cacheBust(`analytics:${token}`); cacheBust(`demo:${token}`);
    return request<{ steps: DemoStep[]; created: number; total_gaps: number; message: string }>(
      `/api/demo/run`, { method: "POST", token },
    );
  },
  actionMemo: (token: string, id: number) =>
    request<ActionMemo>(`/api/reports/action-memo/${id}`, { token }),
  /* ── QR memo verification (public, no auth) ── */
  verifyMemo: (code: string, signal?: AbortSignal) =>
    request<MemoVerification>(`/api/verify/memo/${encodeURIComponent(code.trim())}`, { signal }),
  verifyUrlFor: (code: string) =>
    (typeof window !== "undefined" ? window.location.origin : "") + `/verify/${encodeURIComponent(code.trim())}`,
  /* ── Eligibility Finder (public, no auth) ── */
  eligibilityCheck: (profile: EligibilityProfile, signal?: AbortSignal) =>
    request<EligibilityResult>(`/api/eligibility/check`, { method: "POST", json: profile, signal }),
  /* ── Tamper-evident audit trail (officer) ── */
  auditEvents: (token: string, limit = 100, signal?: AbortSignal) =>
    request<AuditEvent[]>(`/api/audit/events?limit=${limit}`, {
      token, signal, cacheKey: `audit:${token}`, cacheTtl: TTL_SHORT,
    }),
  auditVerify: (token: string, signal?: AbortSignal) =>
    request<ChainReport>(`/api/audit/verify`, { token, signal }),
  /* ── Grievance redressal ── */
  fileGrievance: (token: string, json: { category: string; subject: string; description?: string; application_id?: number | null }) => {
    cacheBust(`myGriev:`);
    return request<Grievance>(`/api/grievances`, { method: "POST", token, json });
  },
  myGrievances: (token: string, signal?: AbortSignal) =>
    request<Grievance[]>(`/api/grievances/me`, {
      token, signal, cacheKey: `myGriev:${token}`, cacheTtl: TTL_SHORT,
    }),
  closeGrievance: (token: string, id: number) => {
    cacheBust(`myGriev:${token}`);
    return request<Grievance>(`/api/grievances/${id}/close`, { method: "PATCH", token });
  },
  officerGrievances: (token: string, status?: string, signal?: AbortSignal) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<Grievance[]>(`/api/grievances${qs}`, {
      token, signal, cacheKey: `offGriev:${token}:${status ?? "all"}`, cacheTtl: TTL_SHORT,
    });
  },
  respondGrievance: (token: string, id: number, response: string, resolve: boolean) => {
    cacheBust(`offGriev:${token}`);
    return request<Grievance>(`/api/grievances/${id}/respond`, {
      method: "PATCH", token, json: { response, resolve },
    });
  },
  gapExportUrl: (params: { status?: string; district?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.district) q.set("district", params.district);
    return `${API_BASE}/api/reports/gap-cases.csv?${q.toString()}`;
  },
  refresh: (token: string) =>
    request<{ access_token: string }>(`/api/auth/refresh`, { method: "POST", token }),
  logout: (token: string) =>
    request<{ message: string }>(`/api/auth/logout`, { method: "POST", token }),
};

export interface GapCase {
  id: number;
  scheme_id: number;
  scheme_name: string | null;
  citizen_name: string;
  aadhaar_masked: string | null;
  district: string;
  block: string;
  village: string;
  label: string;
  confidence: number;
  priority: number;
  explanation: string;
  evidence: { source: string; record: string; match_score: number }[] | null;
  eligibility_signals: Record<string, unknown> | null;
  rule_version: string;
  model_version: string;
  anomaly: Record<string, unknown> | null;
  root_cause: string | null;
  top_factors: string[] | null;
  data_freshness: string | null;
  provenance: { sources: string[]; demo: boolean } | null;
  limitations: string | null;
  status: string;
  assignment: string | null;
  sla_due: string | null;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  verification_history: { action: string; by: string; role: string; reason: string; at: string }[] | null;
  tracking_code: string | null;
  created_at: string;
}

export interface PagedGaps {
  total: number;
  page: number;
  page_size: number;
  ai_candidates: number;
  officer_verified: number;
  items: GapCase[];
}

export interface AnalyticsSummary {
  total_gaps: number;
  open: number;
  verified: number;
  false_positive: number;
  needs_more_data: number;
  high_priority: number;
  by_label: Record<string, number>;
  by_scheme: Record<string, number>;
  by_district: Record<string, number>;
  resolution_rate: number;
  ai_candidates: number;
  officer_verified_outcomes: number;
}

export interface DemoStep {
  step: number;
  activity: string;
  requirement: string;
  live_count: number | null;
}

export interface ActionMemo {
  tracking_code: string;
  verify_url: string | null;
  subject: string;
  body: string;
  decided_by: string | null;
  decided_at: string | null;
  watermark: string;
}

export interface MemoVerification {
  valid: boolean;
  tracking_code: string;
  scheme: string | null;
  status: string | null;
  ai_label: string | null;
  district: string | null;
  decided_at: string | null;
  issued_by_masked: string | null;
  message: string;
}

export interface EligibilityProfile {
  age?: number | null;
  annual_income?: number | null;
  land_acres?: number | null;
  occupation?: string | null;
  category?: string | null;
  is_student?: boolean;
  last_marks_pct?: number | null;
  own_pucca_house?: boolean | null;
  has_ration_card?: boolean | null;
  aadhaar_bank_linked?: boolean | null;
}

export interface SchemeMatch {
  scheme: string;
  score: number;
  verdict: string;
  matched: string[];
  missing: { criterion: string; what_to_do: string }[];
}

export interface EligibilityResult {
  matches: SchemeMatch[];
  note: string;
}

export interface AuditEvent {
  id: number;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  prev_hash: string | null;
  entry_hash: string | null;
  created_at: string;
}

export interface ChainReport {
  ok: boolean;
  algorithm: string;
  checked: number;
  total: number;
  broken_at: number | null;
  message: string;
}

export interface Grievance {
  id: number;
  citizen_id: number;
  citizen_name: string | null;
  citizen_phone: string | null;
  category: string;
  subject: string;
  description: string;
  application_id: number | null;
  status: string;
  officer_response: string | null;
  responded_by: string | null;
  sla_due: string;
  escalated_at: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

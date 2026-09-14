/** Typed API client for the Scheme Sync FastAPI backend. */

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

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
    request<{ access_token: string }>("/api/auth/admin/login", {
      method: "POST",
      json: { email, password },
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
};

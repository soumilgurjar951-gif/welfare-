"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** /admin → dashboard when logged in as admin, else the admin login page. */
export default function AdminIndex() {
  const router = useRouter();
  const { admin, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    router.replace(admin.token ? "/admin/dashboard" : "/admin/login");
  }, [ready, admin.token, router]);

  return <p className="text-sm text-slate-500">Loading admin panel…</p>;
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Landmark, LogOut, ShieldCheck, BarChart3, Layers, FileCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "Executive Dashboard", icon: BarChart3 },
  { href: "/admin/applications", label: "Review Applications", icon: Layers },
  { href: "/admin/logs", label: "Audit Log Timeline", icon: FileCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, adminLogout, ready } = useAuth();

  const onLoginPage = pathname === "/admin/login";

  // Role-based protection: citizens (or logged-out users) can never see admin routes.
  if (ready && !admin.token && !onLoginPage) {
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              <Landmark size={20} />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">Scheme Sync</span>
                <span className="rounded bg-indigo-500/30 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300 border border-indigo-400/30 uppercase">
                  Officer Panel
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Verification & Audit Workspace</p>
            </div>
          </Link>

          {admin.token && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="font-bold text-white">{admin.user?.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
                onClick={() => {
                  adminLogout();
                  router.push("/admin/login");
                }}
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>

        {admin.token && (
          <nav className="mx-auto flex max-w-6xl gap-1.5 px-4 pb-2.5 overflow-x-auto custom-scrollbar">
            {links.map((l) => {
              const Icon = l.icon;
              const isActive = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <Icon size={14} />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">
        {!ready ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Loading officer workspace…
          </div>
        ) : !admin.token && !onLoginPage ? (
          <div className="py-12 text-center text-xs text-slate-500">Redirecting to officer login…</div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}


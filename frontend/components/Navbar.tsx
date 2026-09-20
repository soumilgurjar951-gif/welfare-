"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Officer-only portal navbar — no citizen links. Hidden inside /admin (own shell). */
export function Navbar() {
  const pathname = usePathname();

  // Admin section renders its own shell — hide citizen navbar there.
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="gov-stripe h-1.5" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
            <Landmark size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900">Scheme Sync</span>
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Welfare Gap AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Right Benefit • Right Person • Right Time</p>
          </div>
        </Link>

        <Link href="/admin/login">
          <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
            Officer Login
          </Button>
        </Link>
      </div>
    </header>
  );
}

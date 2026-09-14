"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Landmark,
  LogOut,
  User,
  LayoutDashboard,
  Layers,
  FileText,
  UserCheck,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { NotificationCenter } from "@/components/NotificationCenter";


const citizenLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schemes", label: "Welfare Schemes", icon: Layers },
  { href: "/applications", label: "My Applications", icon: FileText },
  { href: "/profile", label: "My Profile", icon: UserCheck },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { citizen, citizenLogout, ready } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin section renders its own shell — hide citizen navbar there.
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs transition-all">
      <div className="gov-stripe h-1.5" />

      {/* Main header row */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Brand logo */}
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileMenuOpen(false)}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
            <Landmark size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900">Scheme Sync</span>
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                Gov Portal
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Direct Benefit Transfer & Support</p>
          </div>
        </Link>

        {/* Desktop nav links for logged-in citizens */}
        <nav className="hidden items-center gap-1.5 md:flex">
          {citizen.token ? (
            citizenLinks.map((l) => {
              const Icon = l.icon;
              const isActive = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon size={16} />
                  <span>{l.label}</span>
                </Link>
              );
            })
          ) : (
            <Link
              href="/schemes"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100",
                pathname === "/schemes" && "bg-slate-100 text-indigo-700 font-semibold"
              )}
            >
              <Layers size={16} />
              <span>Browse Schemes</span>
            </Link>
          )}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {!ready ? null : citizen.token ? (
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-[11px]">
                  <User size={13} />
                </div>
                <span>{citizen.user?.name}</span>
              </Link>

              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 gap-1.5"
                onClick={() => {
                  citizenLogout();
                  router.push("/");
                }}
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Desktop auth buttons */}
              <Link href="/login" className="hidden md:block">
                <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
                  Citizen Login
                </Button>
              </Link>
              <Link href="/register" className="hidden md:block">
                <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
                  Register
                </Button>
              </Link>

              {/* Mobile hamburger for logged-out users */}
              <button
                className="flex md:hidden items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu — logged-out users only */}
      {!citizen.token && mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white shadow-lg animate-slide-up">
          <nav className="flex flex-col px-4 py-3 gap-1">
            <Link
              href="/schemes"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                pathname === "/schemes"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Layers size={18} className="text-indigo-600" />
              Browse Welfare Schemes
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                pathname === "/login"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <User size={18} className="text-indigo-600" />
              Citizen Login
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Register as Citizen
            </Link>
          </nav>
        </div>
      )}

      {/* Mobile citizen nav — logged-in strip */}
      {citizen.token && (
        <nav className="flex gap-1.5 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden custom-scrollbar bg-slate-50/80">
          {citizenLinks.map((l) => {
            const Icon = l.icon;
            const isActive = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60"
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
  );
}

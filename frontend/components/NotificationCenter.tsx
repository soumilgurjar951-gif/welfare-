"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Bell, Check, CheckCheck, Mail, MessageSquare, Sparkles, X, Smartphone, Info } from "lucide-react";
import { api, type AppNotification } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";

export function NotificationCenter() {
  const { citizen } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async (signal?: AbortSignal) => {
    if (!citizen.token) return;
    // Skip fetch when tab is hidden — saves background network traffic
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    try {
      const data = await api.myNotifications(citizen.token, signal);
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (e) {
      // silent fallback — network errors should not surface in UI
    }
  }, [citizen.token]);

  useEffect(() => {
    const ac = new AbortController();
    fetchNotifs(ac.signal);

    // Poll every 30 s (was 15 s) — halves background traffic.
    // Extra guard: pause polling when the tab is hidden or window loses focus,
    // resume immediately when it becomes visible/focused again.
    const interval = setInterval(() => fetchNotifs(ac.signal), 30_000);

    const onVisible = () => { if (document.visibilityState === "visible") fetchNotifs(ac.signal); };
    const onFocus = () => fetchNotifs(ac.signal);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      ac.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifs]);

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: number) => {
    if (!citizen.token) return;
    try {
      await api.markNotificationRead(citizen.token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { }
  };

  const handleMarkAllRead = async () => {
    if (!citizen.token) return;
    try {
      await api.markAllNotificationsRead(citizen.token);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) { }
  };

  if (!citizen.token) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
        title="Notifications & SMS/Email Alerts"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="gov-stripe flex items-center justify-between p-3.5 text-white">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-sky-300" />
              <h3 className="font-bold text-sm">Notifications & Alerts</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 text-[10px] font-bold">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-200 hover:text-white transition"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 bg-slate-50/50 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center space-y-2 p-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell size={20} />
                </div>
                <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
                <p className="text-[11px] text-slate-400">
                  Application submissions, officer approval decisions, and SMS/Email dispatches will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`p-3.5 text-xs transition cursor-pointer hover:bg-indigo-50/40 ${!n.is_read ? "bg-white font-medium border-l-4 border-l-indigo-600" : "bg-slate-50/80 text-slate-600"
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 leading-tight">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px] mb-2">{n.message}</p>

                  {/* Dispatch Channel Badges */}
                  <div className="flex items-center justify-between border-t border-slate-100/80 pt-1.5 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">
                        <Smartphone size={10} /> SMS Alert
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                        <Mail size={10} /> Email Dispatched
                      </span>
                    </div>
                    {!n.is_read && (
                      <span className="text-indigo-600 font-bold text-[10px] hover:underline flex items-center gap-0.5">
                        <Check size={10} /> Read
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="border-t bg-white p-2.5 text-center text-[10px] text-slate-500">
            Alerts automatically dispatched to registered Email & Phone (+91)
          </div>
        </div>
      )}
    </div>
  );
}

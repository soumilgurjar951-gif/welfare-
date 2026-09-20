"use client";

import { useCallback, useEffect, useState } from "react";
import { PlaySquare, CheckCircle2, Loader2 } from "lucide-react";
import { ApiError, api, type DemoStep } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DemoPage() {
  const { admin } = useAuth();
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(0);

  const load = useCallback(async () => {
    if (!admin.token) return;
    try {
      setSteps(await api.demoWalkthrough(admin.token));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load walkthrough");
    }
  }, [admin.token]);

  useEffect(() => { load(); }, [load]);

  async function run(autoplay: boolean) {
    if (!admin.token) return;
    setRunning(true);
    setError("");
    setMessage("");
    setActive(0);
    try {
      if (autoplay) {
        // Auto Play: animate through the 9 steps, then run the scan.
        for (let i = 1; i <= 9; i++) {
          setActive(i);
          await new Promise((r) => setTimeout(r, 450));
        }
      }
      const res = await api.demoRun(admin.token);
      setSteps(res.steps);
      setActive(9);
      setMessage(res.message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Demo run failed");
    } finally {
      setRunning(false);
    }
  }

  if (!admin.token) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <PlaySquare size={20} className="text-indigo-600" /> Guided Demo — 9 Steps
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          AI Found the Gap → Officer Verified → Action Ready · Madhya Pradesh demo dataset
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={running} onClick={() => run(false)} className="gap-1.5">
          {running ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Run Complete Demo
        </Button>
        <Button size="sm" variant="outline" disabled={running} onClick={() => run(true)} className="gap-1.5">
          <PlaySquare size={14} /> Auto Play walkthrough
        </Button>
      </div>

      {message && <p className="text-sm rounded bg-emerald-50 border border-emerald-200 p-3 text-emerald-800">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3">
        {steps.map((s) => (
          <Card key={s.step} className={active === s.step ? "border-indigo-500 shadow-md" : ""}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  active > s.step ? "bg-emerald-600 text-white" :
                  active === s.step ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {s.step}
                </span>
                {s.activity}
                {s.live_count !== null && s.live_count !== undefined && (
                  <span className="ml-auto text-[11px] text-slate-400">{s.live_count} live</span>
                )}
              </CardTitle>
              <CardDescription className="text-xs">{s.requirement}</CardDescription>
            </CardHeader>
            {active === s.step && running && (
              <CardContent className="py-2 text-[11px] text-indigo-600">Running…</CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

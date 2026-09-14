"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { maskAadhaar } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, User, Mail, Phone, MapPin, Calendar, Lock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileForm {
  name: string;
  phone: string;
  address: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { citizen, ready, refreshCitizen } = useAuth();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileForm>();

  useEffect(() => {
    if (ready && !citizen.token) router.replace("/login");
  }, [ready, citizen.token, router]);

  useEffect(() => {
    if (citizen.user) reset({ name: citizen.user.name, phone: citizen.user.phone, address: citizen.user.address });
  }, [citizen.user, reset]);

  if (!ready || !citizen.token || !citizen.user) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        Loading your profile…
      </div>
    );
  }

  const u = citizen.user;

  async function onSubmit(v: ProfileForm) {
    setMsg("");
    setErr("");
    try {
      await api.updateProfile(citizen.token!, { name: v.name.trim(), phone: v.phone.trim(), address: v.address.trim() });
      await refreshCitizen();
      setMsg("Profile details updated successfully.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Profile update failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Citizen Profile</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your identity credentials and contact information.</p>
      </div>

      {/* Verified Identity Card */}
      <Card className="border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-blue-600" />
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" /> Verified Government Identity
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Read-only Aadhaar & Gov ID verification record</CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 border border-emerald-300">
            Verified Citizen
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs sm:text-sm sm:grid-cols-2 p-5 bg-slate-50/50">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-medium"><User size={13} /> Full Name</span>
            <p className="font-bold text-slate-900">{u.name}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Lock size={13} /> ID Type</span>
            <p className="font-bold text-slate-900 uppercase">{u.id_type}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-medium"><ShieldCheck size={13} className="text-emerald-600" /> Masked Aadhaar</span>
            <p className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit">{maskAadhaar(u.aadhaar_masked)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Lock size={13} /> Secondary Gov ID</span>
            <p className="font-mono font-bold text-slate-900">{u.other_gov_id ?? "N/A"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Mail size={13} /> Email Address</span>
            <p className="font-medium text-slate-900">{u.email}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Calendar size={13} /> Date of Birth</span>
            <p className="font-medium text-slate-900">{u.dob}</p>
          </div>
        </CardContent>
      </Card>

      {/* Editable Details Card */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Editable Contact Details</CardTitle>
          <CardDescription className="text-xs text-slate-500">Update your active phone number and delivery address for scheme notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700">Full Display Name</Label>
              <Input id="name" className="text-xs sm:text-sm rounded-xl border-slate-200 focus:border-indigo-500" {...register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Mobile Phone Number</Label>
              <Input id="phone" className="text-xs sm:text-sm rounded-xl border-slate-200 focus:border-indigo-500" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-bold text-slate-700">Residential Address</Label>
              <Textarea id="address" rows={3} className="text-xs sm:text-sm rounded-xl border-slate-200 focus:border-indigo-500" {...register("address")} />
            </div>

            {msg && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> {msg}
              </div>
            )}
            {err && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                {err}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-6 rounded-xl shadow-sm">
              {isSubmitting ? "Saving Changes…" : "Save Profile Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border border-slate-200/80 bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail size={18} className="text-indigo-600" /> Notification & Alert Dispatch Channels
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Real-time SMS and Email alert dispatches are enabled for your registered phone and email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Phone size={18} />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">SMS Notifications (+91)</p>
                <p className="text-[11px] text-slate-500">Immediate SMS sent on application submission & decision approval.</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</Badge>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                <Mail size={18} />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">Email Alerts ({u.email})</p>
                <p className="text-[11px] text-slate-500">Sanction letter copy & verification updates emailed automatically.</p>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



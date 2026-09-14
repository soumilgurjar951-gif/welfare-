"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Landmark, Lock, UserCheck, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { citizenLogin } = useAuth();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError("");
    try {
      await citizenLogin(values.identifier.trim(), values.password);
      router.push("/dashboard");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Login failed. Please check credentials.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 pb-24">
      <Card className="border border-slate-200/80 bg-white shadow-xl overflow-hidden rounded-3xl">
        <div className="gov-stripe h-2" />
        <CardHeader className="text-center space-y-2 pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
            <UserCheck size={24} />
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900 tracking-tight">Citizen Portal Login</CardTitle>
          <CardDescription className="text-xs text-slate-600">
            Log in using your Aadhaar number, Voter ID, Email, or Mobile + Password.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-bold text-slate-700">
                Aadhaar / Gov ID / Email / Phone
              </Label>
              <Input
                id="identifier"
                placeholder="e.g. 2345 6789 0123 or user@example.com"
                className="text-xs sm:text-sm rounded-xl border-slate-200 h-10 focus:border-indigo-500"
                {...register("identifier")}
              />
              {errors.identifier && <p className="text-xs font-medium text-rose-600">{errors.identifier.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="text-xs sm:text-sm rounded-xl border-slate-200 h-10 focus:border-indigo-500"
                {...register("password")}
              />
              {errors.password && <p className="text-xs font-medium text-rose-600">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md gap-1.5 transition"
            >
              {isSubmitting ? "Authenticating…" : "Login to Citizen Portal"} <ArrowRight size={15} />
            </Button>

            <div className="pt-2 text-center text-xs text-slate-600">
              New to Scheme Sync?{" "}
              <Link href="/register" className="font-bold text-indigo-600 hover:underline">
                Create a Citizen Account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


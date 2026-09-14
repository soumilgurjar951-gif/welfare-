"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin } = useAuth();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  async function onSubmit(values: AdminLoginInput) {
    setServerError("");
    try {
      await adminLogin(values.email.trim(), values.password);
      router.push("/admin/dashboard");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Admin login failed.";
      // Surface CORS/network hints helpfully
      if (/Failed to fetch|Load failed|NetworkError|CORS/i.test(msg)) {
        setServerError(`Cannot reach API at ${process.env.NEXT_PUBLIC_API_URL ?? "backend"}. Is the backend running and CORS allowed? (${msg})`);
      } else {
        setServerError(msg);
      }
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <ShieldCheck size={24} />
          </span>
          <CardTitle>Officer Login</CardTitle>
          <CardDescription>
            Restricted area — only accounts with the <strong>admin</strong> role can sign in here.
            Default seed admin: <code>admin@gov.in</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Official Email</Label>
              <Input id="email" type="email" placeholder="officer@gov.in" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {serverError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Login to Admin Panel"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

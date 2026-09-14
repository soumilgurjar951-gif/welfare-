"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function RegisterPage() {
  const router = useRouter();
  const { citizenLogin } = useAuth();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { id_type: "aadhaar" },
  });
  const idType = useWatch({ control, name: "id_type" });

  async function onSubmit(v: RegisterInput) {
    setServerError("");
    try {
      const payload = {
        name: v.name.trim(),
        id_type: v.id_type,
        aadhaar_number: v.id_type === "aadhaar" ? v.aadhaar_number?.replace(/[\s-]/g, "") : undefined,
        other_gov_id: v.id_type === "aadhaar" ? undefined : v.other_gov_id?.trim().toUpperCase(),
        phone: v.phone.trim(),
        email: v.email.trim(),
        address: v.address.trim(),
        dob: v.dob,
        password: v.password,
      };
      await api.register(payload);
      // Auto-login after successful registration.
      await citizenLogin(v.id_type === "aadhaar" ? payload.aadhaar_number! : payload.other_gov_id!, v.password);
      router.push("/dashboard");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Registration failed. Try again.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Citizen Registration</CardTitle>
          <CardDescription>
            Register with your Aadhaar number or another government ID. Your Aadhaar is hashed —
            only a masked form (XXXX-XXXX-1234) is ever displayed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="As per government ID" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="id_type">ID Type</Label>
              <Select id="id_type" {...register("id_type")}>
                <option value="aadhaar">Aadhaar (12 digits)</option>
                <option value="voter">Voter ID</option>
                <option value="pan">PAN</option>
                <option value="dl">Driving Licence</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              {idType === "aadhaar" ? (
                <>
                  <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
                  <Input id="aadhaar_number" inputMode="numeric" placeholder="2345 6789 0123" {...register("aadhaar_number")} />
                  {errors.aadhaar_number && <p className="text-xs text-red-600">{errors.aadhaar_number.message}</p>}
                </>
              ) : (
                <>
                  <Label htmlFor="other_gov_id">{idType.toUpperCase()} Number</Label>
                  <Input id="other_gov_id" placeholder={idType === "pan" ? "ABCDE1234F" : "ID number"} {...register("other_gov_id")} />
                  {errors.other_gov_id && <p className="text-xs text-red-600">{errors.other_gov_id.message}</p>}
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (10 digits)</Label>
              <Input id="phone" inputMode="numeric" placeholder="9876543210" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.in" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" placeholder="House, street, city, PIN" {...register("address")} />
              {errors.address && <p className="text-xs text-red-600">{errors.address.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" {...register("dob")} />
              {errors.dob && <p className="text-xs text-red-600">{errors.dob.message}</p>}
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" type="password" {...register("confirm")} />
                {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
              </div>
            </div>
            {serverError && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{serverError}</p>}
            <Button type="submit" className="sm:col-span-2" disabled={isSubmitting}>
              {isSubmitting ? "Registering…" : "Register"}
            </Button>
            <p className="text-center text-sm text-slate-600 sm:col-span-2">
              Already registered?{" "}
              <Link href="/login" className="font-medium text-gov-700 hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

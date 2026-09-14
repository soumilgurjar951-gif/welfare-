import { z } from "zod";

const aadhaar = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits")
      .refine((v) => !["0", "1"].includes(v[0]), "Invalid Aadhaar number"),
  );

export const idTypeEnum = z.enum(["aadhaar", "voter", "pan", "dl"]);

export const registerSchema = z
  .object({
    name: z.string().min(2, "Enter your full name").max(120),
    id_type: idTypeEnum,
    aadhaar_number: z.string().optional().or(z.literal("")),
    other_gov_id: z.string().optional().or(z.literal("")),
    phone: z
      .string()
      .regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
    email: z.string().email("Enter a valid email"),
    address: z.string().min(5, "Enter your full address").max(500),
    dob: z.string().min(1, "Date of birth is required"),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Must contain letters and numbers"),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.password !== v.confirm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Passwords do not match", path: ["confirm"] });
    }
    if (v.id_type === "aadhaar") {
      const r = aadhaar.safeParse(v.aadhaar_number ?? "");
      if (!r.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.error.issues[0].message, path: ["aadhaar_number"] });
      }
    } else {
      const raw = (v.other_gov_id ?? "").trim().toUpperCase();
      const ok =
        (v.id_type === "pan" && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(raw)) ||
        (v.id_type === "voter" && /^[A-Z]{3}[0-9]{7}$/.test(raw)) ||
        (v.id_type === "dl" && /^[A-Z]{2}[0-9A-Z]{4,18}$/.test(raw));
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            v.id_type === "pan"
              ? "PAN format: ABCDE1234F"
              : v.id_type === "voter"
                ? "Voter ID format: ABC1234567"
                : "DL format: 2 letters followed by 4–18 characters",
          path: ["other_gov_id"],
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your Aadhaar number or gov ID"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const applySchema = z.object({
  reason: z.string().min(10, "Please explain your need (min 10 characters)").max(2000),
});

export type ApplyInput = z.infer<typeof applySchema>;

export const approveSchema = z.object({
  benefit_amount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
    .pipe(z.number().min(0).max(10_000_000).optional()),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export type ApproveInput = z.infer<typeof approveSchema>;

export const rejectSchema = z.object({
  rejection_reason: z.string().min(5, "Rejection reason is mandatory (min 5 characters)").max(2000),
  remarks: z.string().max(2000).optional().or(z.literal("")),
});

export type RejectInput = z.infer<typeof rejectSchema>;

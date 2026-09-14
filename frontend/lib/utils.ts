import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-style class merger. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Aadhaar is always rendered masked: XXXX-XXXX-1234. */
export function maskAadhaar(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/[\s-]/g, "");
  if (/^\d{12}$/.test(digits)) return `XXXX-XXXX-${digits.slice(-4)}`;
  // Server already sends masked values like XXXX-XXXX-0123 — pass through.
  return value;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatINR(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

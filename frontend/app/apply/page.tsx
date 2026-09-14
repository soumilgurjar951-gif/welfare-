"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApplyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/schemes");
  }, [router]);

  return (
    <div className="mx-auto max-w-xl p-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      Redirecting to schemes catalogue…
    </div>
  );
}

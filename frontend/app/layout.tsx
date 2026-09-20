import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Scheme Sync — Officer Welfare Portal",
  description: "Officer workspace for welfare gap detection, verification and compliance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t bg-slate-900 text-slate-400 py-8 text-center text-xs">
            <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Scheme Sync Portal</span>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 border border-indigo-500/30">Official Portal</span>
              </div>
              <p className="text-slate-400 max-w-md">
                Demonstration welfare portal. Aadhaar identifiers are always securely masked (XXXX-XXXX-1234) and protected.
              </p>
              <div className="flex gap-4 text-slate-400">
                <a href="/admin/login" className="hover:text-white transition">Officer Portal</a>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}


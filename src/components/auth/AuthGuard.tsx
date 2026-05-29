"use client";
// ─── AuthGuard.tsx ────────────────────────────────────────────────────────────
// Simpan file ini ke: src/components/auth/AuthGuard.tsx
//
// Cara pakai: Wrap AppLayout dengan AuthGuard
//   <AuthGuard><AppLayout>...</AppLayout></AuthGuard>
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth/mock-auth";
import { Loader2, Pickaxe } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
    } else {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0a0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <Pickaxe size={18} className="text-black" />
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-sm font-mono">
            <Loader2 size={14} className="animate-spin" />
            Memverifikasi sesi...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
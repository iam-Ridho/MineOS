import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

// ─── AppLayout.tsx ────────────────────────────────────────────────────────────
// Simpan file ini ke: src/components/layout/AppLayout.tsx
// Menggantikan AppLayout lama — ditambahkan AuthGuard
// ─────────────────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#0a0e1a]">
        <Sidebar />
        <main className="flex-1 ml-60 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0e1a]">
      <Sidebar />
      <main className="flex-1 ml-60 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

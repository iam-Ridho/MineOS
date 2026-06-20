import type { AgentStatus } from "@/lib/api/mock-data";

export default function StatusBadge({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { label: string; cls: string }> = {
    active:  { label: "AKTIF",   cls: "text-emerald-600 bg-emerald-50 border-emerald-500/20" },
    idle:    { label: "IDLE",    cls: "text-amber-600  bg-amber-50  border-amber-500/20"  },
    error:   { label: "ERROR",   cls: "text-red-400    bg-red-500/10    border-red-500/20"    },
    offline: { label: "MATI",    cls: "text-slate-500   bg-gray-500/10   border-gray-500/20"   },
  };
  const { label, cls } = map[status] ?? map.offline;
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}
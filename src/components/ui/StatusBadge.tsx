type Status = "active" | "idle" | "error";

export default function StatusBadge({ status }: { status: Status }) {
  const map = {
    active: { label: "AKTIF", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    idle:   { label: "IDLE",  cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    error:  { label: "ERROR", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}
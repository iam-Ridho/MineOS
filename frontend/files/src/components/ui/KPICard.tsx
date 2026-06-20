import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "amber" | "blue" | "emerald" | "red";
}

const colorMap = {
  amber:   { icon: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-500/20" },
  blue:    { icon: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  emerald: { icon: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-500/20" },
  red:     { icon: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
};

export default function KPICard({
  title, value, unit, icon: Icon,
  trend = "neutral", trendValue, color = "amber",
}: KPICardProps) {
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} bg-white p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-widest font-mono">{title}</span>
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon size={15} className={c.icon} />
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-slate-900 tabular-nums">{value}</span>
        {unit && <span className="text-slate-500 text-sm mb-1">{unit}</span>}
      </div>
      {trendValue && (
        <div className="flex items-center gap-1 text-xs">
          <span className={
            trend === "up" ? "text-emerald-600" :
            trend === "down" ? "text-red-400" :
            "text-slate-500"
          }>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"} {trendValue}
          </span>
          <span className="text-slate-600">vs kemarin</span>
        </div>
      )}
    </div>
  );
}
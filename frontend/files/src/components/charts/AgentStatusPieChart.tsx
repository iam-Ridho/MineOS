"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { mockAgents } from "@/lib/api/mock-data";

export default function AgentStatusPieChart() {
  const statusCounts = mockAgents.reduce(
    (acc, agent) => {
      const status = String(agent.status).toLowerCase();

      if (status === "active") acc.active += 1;
      if (status === "idle") acc.idle += 1;
      if (status === "error") acc.error += 1;
      if (status === "offline") acc.offline += 1;

      return acc;
    },
    { active: 0, idle: 0, error: 0, offline: 0 }
  );

  const data = [
    { name: "Aktif",   value: statusCounts.active,  color: "#10b981" },
    { name: "Idle",    value: statusCounts.idle,    color: "#f59e0b" },
    { name: "Error",   value: statusCounts.error,   color: "#ef4444" },
    { name: "Offline", value: statusCounts.offline, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-slate-900 font-semibold text-sm">Status Agents</h3>
        <p className="text-slate-500 text-xs mt-0.5">distribusi saat ini</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
            itemStyle={{ fontSize: 12, color: '#1e293b' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-2">
        {data.map(({ name, value, color }) => (
          <div key={name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-slate-500">{name}</span>
            </div>
            <span className="text-slate-900 font-mono">{value} unit</span>
          </div>
        ))}
      </div>
    </div>
  );
}
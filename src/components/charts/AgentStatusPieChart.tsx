"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { mockKPIs } from "@/lib/api/mock-data";

const data = [
  { name: "Aktif", value: mockKPIs.activeAgents,                              color: "#10b981" },
  { name: "Idle",  value: mockKPIs.totalAgents - mockKPIs.activeAgents - 1,   color: "#f59e0b" },
  { name: "Error", value: 1,                                                   color: "#ef4444" },
];

export default function AgentStatusPieChart() {
  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm">Status Agents</h3>
        <p className="text-gray-500 text-xs mt-0.5">distribusi saat ini</p>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
            itemStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2 mt-2">
        {data.map(({ name, value, color }) => (
          <div key={name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-400">{name}</span>
            </div>
            <span className="text-white font-mono">{value} unit</span>
          </div>
        ))}
      </div>
    </div>
  );
}
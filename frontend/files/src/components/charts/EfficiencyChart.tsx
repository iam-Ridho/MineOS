"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const data = [
  { date: "Sen", excavator: 88, haul: 75, drill: 92 },
  { date: "Sel", excavator: 82, haul: 80, drill: 88 },
  { date: "Rab", excavator: 79, haul: 72, drill: 0  },
  { date: "Kam", excavator: 91, haul: 85, drill: 90 },
  { date: "Jum", excavator: 85, haul: 78, drill: 87 },
  { date: "Sab", excavator: 88, haul: 82, drill: 91 },
  { date: "Min", excavator: 76, haul: 68, drill: 83 },
];

export default function EfficiencyChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-6">
        <h3 className="text-slate-900 font-semibold text-sm">Efisiensi Agent</h3>
        <p className="text-slate-500 text-xs mt-0.5">% efisiensi per unit per hari</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
            labelStyle={{ color: "#f9fafb", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />
          <Line type="monotone" dataKey="excavator" name="Excavator"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="haul"      name="Haul Truck" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="drill"     name="Drill Unit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
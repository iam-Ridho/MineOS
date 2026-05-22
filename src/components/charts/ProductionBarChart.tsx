"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const data = [
  { date: "Sen", production: 4500 },
  { date: "Sel", production: 4780 },
  { date: "Rab", production: 4200 },
  { date: "Kam", production: 5100 },
  { date: "Jum", production: 4820 },
  { date: "Sab", production: 4950 },
  { date: "Min", production: 3820 },
];

export default function ProductionBarChart() {
  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-semibold text-sm">Produksi per Hari</h3>
          <p className="text-gray-500 text-xs mt-0.5">ton/hari vs target 5.000 ton</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Produksi
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2.5 h-1 bg-gray-500 inline-block" /> Target
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 6000]} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
            labelStyle={{ color: "#f9fafb", fontSize: 12 }}
            itemStyle={{ color: "#f59e0b", fontSize: 12 }}
            formatter={(v: number) => [`${v.toLocaleString()} ton`, "Produksi"]}
          />
          <ReferenceLine y={5000} stroke="#6b7280" strokeDasharray="4 4" />
          <Bar dataKey="production" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
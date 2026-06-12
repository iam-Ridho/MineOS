"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { mockProductionData } from "@/lib/lib/api/mock-data";

export default function ProductionChart() {
  const data = mockProductionData.map((d) => ({
    ...d,
    date: d.date.slice(5),
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-slate-900 font-semibold text-sm">Produksi Harian</h3>
          <p className="text-slate-500 text-xs mt-0.5">7 hari terakhir (ton/hari)</p>
        </div>
        <span className="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-500/20">
          LIVE
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
            labelStyle={{ color: "#f9fafb", fontSize: 12 }}
            itemStyle={{ color: "#f59e0b", fontSize: 12 }}
            formatter={(v: number) => [`${v.toLocaleString()} ton`, "Produksi"]}
          />
          <Area
            type="monotone"
            dataKey="production"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#prodGrad)"
            dot={{ fill: "#f59e0b", r: 3 }}
            activeDot={{ r: 5, fill: "#f59e0b" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
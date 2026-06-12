"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  LineChart as LineChartIcon, Leaf, Activity, RefreshCw,
  FileText, Download, Zap, AlertTriangle, TrendingUp,
  Cpu, Wifi
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { mockAgents, INITIAL_TELEMETRY } from "@/lib/api/mock-data";

// ── Production data ─────────────────────────────────────────────────────────────
const PRODUCTION_YIELD_WEEK = [
  { name: "MON", Actual: 84000, Target: 75000 },
  { name: "TUE", Actual: 112000, Target: 75000 },
  { name: "WED", Actual: 62000, Target: 75000 },
  { name: "THU", Actual: 128000, Target: 75000 },
  { name: "FRI", Actual: 109000, Target: 75000 },
  { name: "SAT", Actual: 91000, Target: 75000 },
  { name: "SUN", Actual: 122000, Target: 75000 }
];

// ── Emission data ─────────────────────────────────────────────────────────────
const EMISSION_UNITS = [
  { id: "Hauler Unit 42", value: 18.2, color: "text-blue-600" },
  { id: "Hauler Unit 09", value: 26.4, color: "text-amber-600" },
  { id: "Hauler Unit 17", value: 19.1, color: "text-blue-600" },
];

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 shadow-xl font-mono">
      <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="text-[10px]" style={{ color: p.color }}>{p.name}</span>
          <span className="text-slate-900 text-xs font-bold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Status badge color ────────────────────────────────────────────────────────
const STATUS_CLS: Record<string, string> = {
  NOMINAL:  "text-blue-600  bg-blue-50  border-blue-500/20",
  WARNING:  "text-amber-600 bg-amber-50 border-amber-500/20",
  CRITICAL: "text-red-400   bg-red-500/10   border-red-500/20",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { telemetryStream, refetchTelemetry } = useTelemetry();
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const stream = telemetryStream.length > 0 ? telemetryStream : INITIAL_TELEMETRY;
  const activeCount = mockAgents.filter(a => (a as any).status === "active").length;

  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] bg-slate-50">
      <div className="p-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans text-xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-1.5 h-7 bg-cyan-500 rounded-sm" />
              Operational Analytics
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-1">
              Real-time throughput and predictive performance modeling.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:border-slate-300 transition-colors">
              <FileText size={12} /> PDF Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:border-slate-300 transition-colors">
              <Download size={12} /> CSV Export
            </button>
            <button
              onClick={refetchTelemetry}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-colors"
            >
              <RefreshCw size={12} /> Refresh Stream
            </button>
          </div>
        </div>

        {/* ── Row 1: Production Chart + 7-Day Prediction ──────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Production bar chart */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 border-l-2 border-l-cyan-500 p-6 shadow-lg">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-5">
              <LineChartIcon size={13} className="text-blue-600" />
              Daily Production Yield (Tons)
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={PRODUCTION_YIELD_WEEK}
                  barCategoryGap="30%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="rgba(100,116,139,0.4)"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(100,116,139,0.4)"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(59,130,246,0.04)" }} />
                  <ReferenceLine y={75000} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.3} />
                  <Bar
                    dataKey="Actual"
                    fill="rgba(6,182,212,0.45)"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="Target"
                    fill="rgba(255,185,95,0.2)"
                    stroke="#ffb95f"
                    strokeWidth={1}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500/45 border border-blue-500" />
                <span className="text-[9px] text-slate-500 uppercase">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-400" />
                <span className="text-[9px] text-slate-500 uppercase">Target</span>
              </div>
            </div>
          </div>

          {/* 7-Day Prediction panel */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 border-l-2 border-l-amber-500 p-6 shadow-lg flex flex-col gap-5">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <TrendingUp size={13} className="text-amber-600" />
              7-Day Prediction
            </h2>

            {/* Production Stability */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Production Stability</span>
                <span className="font-mono text-[10px] font-bold text-blue-600">94.2%</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: "94.2%", boxShadow: "0 0 8px #06b6d480" }} />
              </div>
            </div>

            {/* Maintenance Risk */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Maintenance Risk</span>
                <span className="font-mono text-[10px] font-bold text-blue-600">LOW</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/40 rounded-full" style={{ width: "18%", boxShadow: "0 0 8px #06b6d440" }} />
              </div>
            </div>

            {/* AI Advisory */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={9} className="text-blue-600" />
                <span className="font-mono text-[9px] font-bold text-blue-600 uppercase tracking-widest">AI Advisory</span>
              </div>
              <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
                Cluster 8 haulers show 12% increased core vibration. Potential axle fatigue prediction in 4.2 days. Suggest preventive lubrication cycle in next shift.
              </p>
            </div>

            {/* Output + Reliability */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">Output Est.</p>
                <p className="font-mono text-sm font-bold text-slate-900">840t</p>
              </div>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">Reliability</p>
                <p className="font-mono text-sm font-bold text-blue-600">HIGH</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Emission Monitor + GIS Elevation Twin Mesh ───────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Emission Monitor */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border border-slate-200 border-l-2 border-l-emerald-500 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Leaf size={13} className="text-emerald-600" />
                Emission Monitor
              </h2>
              <span className="font-mono text-[9px] px-2 py-1 rounded border border-emerald-300 bg-emerald-50 text-emerald-600 font-bold uppercase tracking-widest">
                Net Zero Tracking
              </span>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">Avg CO₂ Per Trip</p>
                <p className="font-mono text-xl font-bold text-slate-900">24.5 <span className="text-xs text-slate-500">kg</span></p>
              </div>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">Fleet Total (24h)</p>
                <p className="font-mono text-xl font-bold text-slate-900">3.2 <span className="text-xs text-slate-500">tons</span></p>
              </div>
            </div>

            {/* Per-unit breakdown */}
            <div className="space-y-2.5">
              {EMISSION_UNITS.map((u) => (
                <div key={u.id} className="flex items-center justify-between bg-slate-50 rounded-lg border border-slate-200 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span className="font-mono text-[10px] text-slate-500">{u.id}</span>
                  </div>
                  <span className={`font-mono text-[10px] font-bold ${u.color}`}>{u.value} kg/trip</span>
                </div>
              ))}
            </div>
          </div>

          {/* GIS Elevation Twin Mesh */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg relative">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Activity size={13} className="text-blue-600" />
                GIS Elevation Twin Mesh
              </h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#3b82f6]" />
                <span className="font-mono text-[9px] text-blue-600 font-bold uppercase tracking-widest">Online</span>
              </div>
            </div>

            {/* Topographic contour SVG */}
            <div className="relative h-52 overflow-hidden bg-slate-50">
              <svg viewBox="0 0 700 220" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <rect width="700" height="220" fill="url(#meshGlow)" />
                {/* Contour lines */}
                {[0,1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
                  <ellipse
                    key={i}
                    cx={350 + Math.sin(i * 0.5) * 20}
                    cy={110 + Math.cos(i * 0.4) * 10}
                    rx={30 + i * 26}
                    ry={18 + i * 14}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={0.6}
                    strokeOpacity={0.12 - i * 0.008}
                    filter="url(#glow)"
                  />
                ))}
                {/* Horizontal scan lines */}
                {Array.from({ length: 18 }).map((_, i) => (
                  <line
                    key={i}
                    x1={0} y1={i * 13} x2={700} y2={i * 13}
                    stroke="#3b82f6" strokeWidth={0.3} strokeOpacity={0.04}
                  />
                ))}
                {/* Vertical scan lines */}
                {Array.from({ length: 28 }).map((_, i) => (
                  <line
                    key={i}
                    x1={i * 26} y1={0} x2={i * 26} y2={220}
                    stroke="#3b82f6" strokeWidth={0.3} strokeOpacity={0.04}
                  />
                ))}
                {/* Node dots */}
                {[
                  [350, 110], [280, 95], [420, 130], [310, 140], [390, 85],
                  [450, 105], [250, 120], [340, 70], [460, 150], [200, 100]
                ].map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r={3} fill="#3b82f6" opacity={0.7} filter="url(#glow)" />
                    <circle cx={x} cy={y} r={6} fill="none" stroke="#3b82f6" strokeWidth={0.5} opacity={0.3} />
                  </g>
                ))}
                {/* Mesh lines between nodes */}
                {[
                  [350, 110, 280, 95], [350, 110, 420, 130], [280, 95, 310, 140],
                  [420, 130, 460, 150], [350, 110, 340, 70], [280, 95, 250, 120],
                  [420, 130, 390, 85], [250, 120, 200, 100], [340, 70, 390, 85],
                  [460, 150, 450, 105]
                ].map(([x1, y1, x2, y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#3b82f6" strokeWidth={0.5} strokeOpacity={0.2} />
                ))}
              </svg>
            </div>

            {/* Mesh stats */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200">
              <div>
                <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">Mesh Nodes Connected</p>
                <p className="font-mono text-xs text-slate-500 leading-relaxed max-w-xs">
                  Direct peer-to-peer satellite mesh network active across the open pit floor. Average ping index: 4ms.
                </p>
              </div>
              <span className="font-mono text-xl font-bold text-blue-600 flex-shrink-0 ml-4">1,402</span>
            </div>
          </div>
        </div>

        {/* ── Row 3: Detailed Telemetry Stream ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Activity size={13} className="text-blue-600" />
              Detailed Telemetry Stream
            </h2>
            <div className="flex items-center gap-4 font-mono text-[9px]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-slate-500">NOMINAL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-slate-500">WARNING</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-slate-500">CRITICAL</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-widest text-[9px]">
                  {["Timestamp", "Asset ID", "Sensor Node", "Metric", "Value", "System Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stream.map((row, i) => (
                  <tr key={i} className="hover:bg-white/30 transition-colors">
                    <td className="px-6 py-3 text-slate-500">{row.timestamp}</td>
                    <td className="px-6 py-3 text-blue-600 font-bold">{row.assetId}</td>
                    <td className="px-6 py-3 text-slate-700">{row.sensor}</td>
                    <td className="px-6 py-3 text-slate-500">{row.metric}</td>
                    <td className="px-6 py-3 text-slate-900 font-bold">{row.value}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${STATUS_CLS[row.status] ?? STATUS_CLS.NOMINAL}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Row 4: Weekly Summary + Agent Status ────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Weekly summary */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-4">
              <TrendingUp size={12} className="text-blue-600" />
              Ringkasan Minggu Ini
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Produksi",     value: "32.170 ton", color: "text-amber-600"   },
                { label: "Rata-rata/Hari",      value: "4.596 ton",  color: "text-blue-600"    },
                { label: "Efisiensi Rata-rata", value: "82.4%",      color: "text-emerald-600" },
                { label: "Downtime Total",      value: "14.2 jam",   color: "text-red-400"     },
                { label: "Agent Aktif",         value: `${activeCount} / ${mockAgents.length}`, color: "text-emerald-600" },
                { label: "Alert Terjadi",       value: "7 kali",     color: "text-red-400"     },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                  <p className={`font-mono text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agent status breakdown */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 shadow-lg">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-4">
              <Cpu size={12} className="text-blue-600" />
              Agent Status
            </h3>
            <div className="space-y-3">
              {(["active", "idle", "error"] as const).map((status) => {
                const count = mockAgents.filter(a => (a as any).status === status).length;
                const pct   = Math.round((count / mockAgents.length) * 100);
                const colors: Record<string, { bar: string; text: string; bg: string }> = {
                  active: { bar: "bg-cyan-500",   text: "text-blue-600",  bg: "shadow-[0_0_8px_#3b82f680]" },
                  idle:   { bar: "bg-amber-500",  text: "text-amber-600", bg: "shadow-[0_0_8px_#f59e0b80]" },
                  error:  { bar: "bg-red-500",    text: "text-red-400",   bg: "shadow-[0_0_8px_#ef444480]" },
                };
                const c = colors[status];
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">{status}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[9px] font-bold ${c.text}`}>{count} agent</span>
                        <span className="font-mono text-[9px] text-slate-600">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.bar} ${c.bg} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Network */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                <Wifi size={10} className="text-blue-600" />
                <span>UI-THEME: NEON_ATMOSPHERE</span>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 mt-1.5">
                <AlertTriangle size={10} className="text-amber-600" />
                <span>Mock Data — Kideco, Batu Sopang, Paser, Kaltim</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
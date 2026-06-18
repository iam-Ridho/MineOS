// src/app/digital-twin/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { X, Activity, MapPin, Radio, Weight, Droplets, Menu, XIcon, Clock } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useSupabaseAgents } from "@/hooks/useSupabaseAgents";

// ============ KONSTANTA ============

type PitZoneStatus = "active" | "danger" | "standby";

interface PitZone {
  id: string;
  label: string;
  status: PitZoneStatus;
}

const PIT_ZONES: PitZone[] = [
  { id: "ZONE-ALPHA", label: "ZONE-ALPHA", status: "active" },
  { id: "BLASTING-R4", label: "BLASTING-R4", status: "danger" },
  { id: "LOADING-DOCK", label: "LOADING-DOCK", status: "standby" },
];

const PIT_ZONE_DOT: Record<PitZoneStatus, string> = {
  active: "bg-cyan-400 shadow-[0_0_6px_#3b82f6]",
  danger: "bg-red-400 shadow-[0_0_6px_#ef4444]",
  standby: "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
};

const STATUS_STYLE: Record<string, { cls: string; dot: string }> = {
  active: {
    cls: "text-blue-600 border-blue-300 bg-blue-50",
    dot: "bg-cyan-400 shadow-[0_0_6px_#3b82f6]",
  },
  idle: {
    cls: "text-amber-600 border-amber-300 bg-amber-50",
    dot: "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
  },
  error: {
    cls: "text-red-400 border-red-500/30 bg-red-500/10",
    dot: "bg-red-400 shadow-[0_0_6px_#ef4444]",
  },
  offline: {
    cls: "text-slate-500 border-slate-300/30 bg-slate-100/30",
    dot: "bg-slate-500",
  },
};

// ============ KOMPONEN ============

const CesiumViewer = dynamic(
  () => import("@/components/map/CesiumViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-3">
            <div className="w-10 h-10 border border-blue-300 rounded-full absolute animate-ping" />
            <div className="w-10 h-10 border-2 border-t-cyan-500 border-r-cyan-500/30 border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-blue-600 text-xs font-mono uppercase tracking-widest">Syncing Digital Twin</p>
          <p className="text-slate-600 text-[10px] mt-1 font-mono">Kideco · Batu Sopang · Paser · Kaltim</p>
        </div>
      </div>
    ),
  }
);

function AgentModal({ agentId, onClose, agents }: { agentId: string; onClose: () => void; agents: any[] }) {
  const agent = agents.find((a) => a.id === agentId) as any;
  if (!agent) return null;

  const s = STATUS_STYLE[agent.status] ?? STATUS_STYLE.offline;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto w-80 bg-slate-50 border border-slate-300/60 border-t-2 border-t-cyan-500 rounded-xl shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 0 30px rgba(6,182,212,0.12), 0 0 60px rgba(6,182,212,0.04)" }}
      >
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-blue-600" />
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Unit Telemetry: {agent.name}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Type</p>
              <p className="font-mono text-xs text-slate-900">{agent.type || "Heavy Equipment"}</p>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded border ${s.cls}`}>
              {agent.status.toUpperCase()}
            </span>
          </div>

          {/* Grid Detail — HANYA DATA REAL DARI SUPABASE */}
          <div className="grid grid-cols-2 gap-2">
            {/* Load Weight */}
            {agent.load_weight_ton !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Weight size={8} /> Load Weight
                </p>
                <p className="font-mono text-sm font-bold text-blue-600">
                  {agent.load_weight_ton}t
                </p>
              </div>
            )}

            {/* Fuel */}
            {agent.fuel_pct !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Droplets size={8} /> Fuel
                </p>
                <p
                  className={`font-mono text-sm font-bold ${
                    agent.fuel_pct < 20 ? "text-red-400" : agent.fuel_pct < 40 ? "text-amber-600" : "text-blue-600"
                  }`}
                >
                  {agent.fuel_pct}%
                </p>
              </div>
            )}

            {/* Speed */}
            {agent.speed_kmh !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Speed</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {agent.speed_kmh} km/h
                </p>
              </div>
            )}

            {/* Heading */}
            {agent.heading_deg !== undefined && (
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Heading</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {agent.heading_deg}°
                </p>
              </div>
            )}
          </div>

          {/* Zone */}
          {agent.zone && (
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Zone</p>
              <p className="font-mono text-sm font-bold text-blue-600">{agent.zone}</p>
            </div>
          )}

          {/* Operator */}
          {agent.operator && (
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Operator</p>
              <p className="font-mono text-sm font-bold text-slate-900">{agent.operator}</p>
            </div>
          )}

          {/* Timestamp */}
          {agent.timestamp && (
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock size={8} /> Last Update
              </p>
              <p className="font-mono text-xs text-slate-900">
                {new Date(agent.timestamp).toLocaleString("id-ID")}
              </p>
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
            <MapPin size={9} />
            {agent.location?.lat?.toFixed(5) || -1.9}, {agent.location?.lon?.toFixed(5) || 115.8}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 border border-blue-300 text-blue-600 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-blue-100 transition-colors">
              <Radio size={10} /> Communicate
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100/60 border border-slate-300/40 text-slate-700 text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-slate-700/60 transition-colors">
              <MapPin size={10} /> View Path
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ PAGE UTAMA ============

function DigitalTwinContent() {
  const { wsConnected } = useTelemetry();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // ✅ HANYA PAKAI DATA REAL DARI SUPABASE — TIDAK ADA MOCK FALLBACK
  const { agents: supabaseAgents, loading, error, wsStatus } = useSupabaseAgents();

  // Deteksi mode mobile
  const searchParams = useSearchParams();
  const isMobile = searchParams.get("mobile") === "true";
  const [showSidebar, setShowSidebar] = useState(false);

  // ✅ TIDAK ADA MOCK FALLBACK — hanya data real
  const displayAgents = supabaseAgents;

  // ============ MODE MOBILE ============
  if (isMobile) {
    return (
      <div className="relative w-screen h-screen bg-slate-50 overflow-hidden">
        {/* Map fullscreen */}
        <CesiumViewer
          onSelectAgent={(id) => setSelectedAgent(id)}
          selectedAgent={selectedAgent}
          agents={displayAgents}
        />

        {/* Tombol toggle sidebar */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/80 backdrop-blur border border-slate-300 rounded-lg flex items-center justify-center text-blue-600 hover:bg-slate-100 transition-colors"
        >
          {showSidebar ? <XIcon size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar overlay */}
        {showSidebar && (
          <div className="absolute inset-y-0 left-0 w-72 bg-slate-50 border-r border-slate-200 z-40 overflow-y-auto shadow-2xl">
            <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-blue-600" />
                <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                  Active Fleet
                </span>
              </div>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-blue-300 text-blue-600 bg-blue-50">
                {displayAgents.filter((a) => (a as any).status === "active").length} LIVE
              </span>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="px-4 py-4 text-center">
                <div className="w-6 h-6 border-2 border-t-blue-500 border-r-blue-500/30 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[9px] font-mono text-slate-500">Loading fleet data...</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && displayAgents.length === 0 && (
              <div className="px-4 py-4 text-center">
                <p className="text-[9px] font-mono text-red-400">{error}</p>
                <p className="text-[9px] font-mono text-slate-500 mt-1">No data available</p>
              </div>
            )}

            <div className="flex-1 divide-y divide-slate-800/60">
              {displayAgents.map((agent) => {
                const a = agent as any;
                const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.offline;
                const isSelected = selectedAgent === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedAgent(isSelected ? null : a.id);
                      setShowSidebar(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-all duration-150 hover:bg-slate-100/500 ${
                      isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-900 truncate pr-2">
                        {a.name}
                      </span>
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm border flex-shrink-0 ${s.cls}`}
                      >
                        {a.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-slate-500">LAT: {a.location?.lat?.toFixed(5)}</p>
                    <p className="font-mono text-[9px] text-slate-500 mb-1.5">
                      LON: {a.location?.lon?.toFixed(5)}
                    </p>
                    {/* Speed indicator */}
                    {a.speed_kmh !== undefined && (
                      <p className="font-mono text-[9px] text-slate-600">
                        {a.speed_kmh} km/h · {a.zone || "Unknown"}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent Modal */}
        {selectedAgent && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-4">
            <div className="pointer-events-auto w-full max-w-sm">
              <AgentModal
                agentId={selectedAgent}
                onClose={() => setSelectedAgent(null)}
                agents={displayAgents}
              />
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-50/90 backdrop-blur border-t border-slate-200 px-4 py-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                wsConnected ? "bg-cyan-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
              {wsConnected ? "Live" : wsStatus || "Syncing"}
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-600">MOBILE MODE</span>
        </div>
      </div>
    );
  }

  // ============ MODE DESKTOP ============
  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)] bg-slate-50">
      {/* Left sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-blue-600" />
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Active Fleet
            </span>
          </div>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-blue-300 text-blue-600 bg-blue-50">
            {displayAgents.filter((a) => (a as any).status === "active").length} LIVE
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="px-4 py-4 text-center">
            <div className="w-6 h-6 border-2 border-t-blue-500 border-r-blue-500/30 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[9px] font-mono text-slate-500">Loading fleet data...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && displayAgents.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-[9px] font-mono text-red-400">{error}</p>
            <p className="text-[9px] font-mono text-slate-500 mt-1">No data available</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && displayAgents.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-[9px] font-mono text-slate-500">No fleet data</p>
            <p className="text-[9px] font-mono text-slate-400 mt-1">Waiting for broadcast...</p>
          </div>
        )}

        <div className="flex-1 divide-y divide-slate-800/60">
          {displayAgents.map((agent) => {
            const a = agent as any;
            const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.offline;
            const isSelected = selectedAgent === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setSelectedAgent(isSelected ? null : a.id)}
                className={`w-full text-left px-4 py-3 transition-all duration-150 hover:bg-slate-100/500 ${
                  isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-slate-900 truncate pr-2">
                    {a.name}
                  </span>
                  <span
                    className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-sm border flex-shrink-0 ${s.cls}`}
                  >
                    {a.status.toUpperCase()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-slate-500">LAT: {a.location?.lat?.toFixed(5)}</p>
                <p className="font-mono text-[9px] text-slate-500 mb-1.5">
                  LON: {a.location?.lon?.toFixed(5)}
                </p>
                {/* Real data indicators */}
                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-600">
                  {a.speed_kmh !== undefined && <span>{a.speed_kmh} km/h</span>}
                  {a.fuel_pct !== undefined && (
                    <span className={a.fuel_pct < 20 ? "text-red-400" : ""}>
                      F:{a.fuel_pct}%
                    </span>
                  )}
                  {a.zone && <span className="text-slate-500">{a.zone}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center: Cesium Map */}
      <main className="flex-1 relative overflow-hidden">
        <CesiumViewer
          onSelectAgent={(id) => setSelectedAgent(id)}
          selectedAgent={selectedAgent}
          agents={displayAgents}
        />

        {selectedAgent && (
          <AgentModal
            agentId={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            agents={displayAgents}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-slate-50/90 backdrop-blur border-t border-slate-200 px-4 py-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                wsConnected ? "bg-cyan-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
              {wsConnected 
                ? `Live Telemetry · ${displayAgents.length} units` 
                : wsStatus === 'CLOSED' 
                  ? "WebSocket Closed · Reconnecting..." 
                  : "Telemetry Status · Syncing"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] text-slate-600">REGION: PACIFIC-NORTH</span>
            <span className="font-mono text-[9px] text-slate-600">UI-THEME: NEON_ATMOSPHERE</span>
          </div>
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-l border-slate-200 bg-slate-50 overflow-y-auto">
        {/* Weather */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-sm border border-blue-500/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
            </div>
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Weather Station
            </span>
          </div>
          <div className="flex items-end gap-1 mb-1">
            <span className="font-mono text-4xl font-bold text-slate-900">24</span>
            <span className="font-mono text-base text-slate-900 mb-1">°C</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[9px] text-slate-600">VISIBILITY</span>
            <span className="font-mono text-[9px] text-blue-600 font-bold">OPTIMAL</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Wind Speed", value: "12.4 km/h NW" },
              { label: "Humidity", value: "42%" },
              { label: "UV Index", value: "High (7)" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-slate-500">{row.label}</span>
                <span className="font-mono text-[9px] text-slate-700">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pit Zones */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-sm border border-amber-500/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            </div>
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Pit Zones
            </span>
          </div>
          <div className="space-y-2">
            {PIT_ZONES.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60"
              >
                <span className="font-mono text-[9px] text-slate-700">{zone.label}</span>
                <div className={`w-2 h-2 rounded-full ${PIT_ZONE_DOT[zone.status]}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Agent Summary — REAL DATA */}
        <div className="px-4 py-4 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-sm border border-slate-300/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Fleet Summary
            </span>
          </div>
          <div className="space-y-2">
            {/* Total units */}
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60">
              <span className="font-mono text-[9px] text-slate-500">Total Units</span>
              <span className="font-mono text-[9px] font-bold text-slate-900">{displayAgents.length}</span>
            </div>
            {/* Average speed */}
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60">
              <span className="font-mono text-[9px] text-slate-500">Avg Speed</span>
              <span className="font-mono text-[9px] font-bold text-blue-600">
                {displayAgents.length > 0 
                  ? Math.round(displayAgents.reduce((sum, a) => sum + (a.speed_kmh || 0), 0) / displayAgents.length)
                  : 0} km/h
              </span>
            </div>
            {/* Low fuel */}
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60">
              <span className="font-mono text-[9px] text-slate-500">Low Fuel (&lt;20%)</span>
              <span className={`font-mono text-[9px] font-bold ${
                displayAgents.filter((a) => (a.fuel_pct || 0) < 20).length > 0 ? "text-red-400" : "text-slate-900"
              }`}>
                {displayAgents.filter((a) => (a.fuel_pct || 0) < 20).length}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function DigitalTwinPage() {
  return (
    <React.Suspense fallback={<div className="p-4 text-xs font-mono text-center">Loading Digital Twin...</div>}>
      <DigitalTwinContent />
    </React.Suspense>
  );
}
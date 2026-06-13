// src/app/digital-twin/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { X, Activity, MapPin, Radio, Battery, Bot, Zap, Weight, Droplets, Menu, XIcon } from "lucide-react";
import { mockAgents } from "@/lib/api/mock-data";
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
  const isHeavy = agent.type === "heavy_equipment";

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
              <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Model</p>
              <p className="font-mono text-xs text-slate-900">
                {isHeavy ? agent.vehicleModel || "Heavy Equipment" : "Safety Monitoring Unit"}
              </p>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-1 rounded border ${s.cls}`}>
              {agent.status.toUpperCase()}
            </span>
          </div>

          {/* Grid Detail */}
          <div className="grid grid-cols-2 gap-2">
            {/* Load Weight */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Weight size={8} /> Load Weight
              </p>
              <p className="font-mono text-sm font-bold text-blue-600">
                {agent.load_weight || agent.load_weight_ton || 0}t
              </p>
            </div>

            {/* Fuel */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Droplets size={8} /> Fuel
              </p>
              <p
                className={`font-mono text-sm font-bold ${
                  agent.fuel < 20 ? "text-red-400" : agent.fuel < 40 ? "text-amber-600" : "text-blue-600"
                }`}
              >
                {agent.fuel}%
              </p>
            </div>

            {/* Battery */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Battery size={8} /> Battery
              </p>
              <p
                className={`font-mono text-sm font-bold ${
                  agent.battery < 25 ? "text-red-400" : agent.battery < 50 ? "text-amber-600" : "text-slate-900"
                }`}
              >
                {agent.battery}%
              </p>
            </div>

            {/* Sensor */}
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Zap size={8} /> Sensor
              </p>
              <p
                className={`font-mono text-sm font-bold ${
                  agent.sensor_status === "fault"
                    ? "text-red-400"
                    : agent.sensor_status === "warning"
                    ? "text-amber-600"
                    : "text-blue-600"
                }`}
              >
                {agent.sensor_status?.toUpperCase() || "HEALTHY"}
              </p>
            </div>
          </div>

          {/* Zone */}
          <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Zone</p>
            <p className="font-mono text-sm font-bold text-blue-600">{agent.zone || "Unknown"}</p>
          </div>

          {/* Speed & Heading */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Speed</p>
              <p className="font-mono text-sm font-bold text-slate-900">
                {agent.speed || agent.speed_kmh || 0} km/h
              </p>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Heading</p>
              <p className="font-mono text-sm font-bold text-slate-900">
                {agent.heading || agent.heading_deg || 0}°
              </p>
            </div>
          </div>

          {/* Operator */}
          <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Operator</p>
            <p className="font-mono text-sm font-bold text-slate-900">{agent.operator || "Unassigned"}</p>
          </div>

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

export default function DigitalTwinPage() {
  const { wsConnected } = useTelemetry();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const { agents: supabaseAgents, loading, error } = useSupabaseAgents();

  // Deteksi mode mobile
  const searchParams = useSearchParams();
  const isMobile = searchParams.get("mobile") === "true";
  const [showSidebar, setShowSidebar] = useState(false);

  const displayAgents = useMemo(() => {
    return supabaseAgents.length > 0 ? supabaseAgents : mockAgents;
  }, [supabaseAgents]);

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
                <Bot size={13} className="text-blue-600" />
                <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                  Active Fleet
                </span>
              </div>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-blue-300 text-blue-600 bg-blue-50">
                {displayAgents.filter((a) => (a as any).status === "active").length} LIVE
              </span>
            </div>

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
                    <div className="flex items-center gap-1.5">
                      <Battery size={8} className="text-slate-600" />
                      <div className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${a.battery}%`,
                            background:
                              a.battery < 25 ? "#ef4444" : a.battery < 50 ? "#f59e0b" : "#06b6d4",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[8px] text-slate-600">{a.battery}%</span>
                    </div>
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
              {wsConnected ? "Live" : "Syncing"}
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
            <Bot size={13} className="text-blue-600" />
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Active Fleet
            </span>
          </div>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-blue-300 text-blue-600 bg-blue-50">
            {displayAgents.filter((a) => (a as any).status === "active").length} LIVE
          </span>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30">
            <p className="text-[9px] font-mono text-red-400">{error}. Using mock data.</p>
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
                <div className="flex items-center gap-1.5">
                  <Battery size={8} className="text-slate-600" />
                  <div className="flex-1 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${a.battery}%`,
                        background:
                          a.battery < 25 ? "#ef4444" : a.battery < 50 ? "#f59e0b" : "#06b6d4",
                      }}
                    />
                  </div>
                  <span className="font-mono text-[8px] text-slate-600">{a.battery}%</span>
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
              {wsConnected ? "Live Telemetry · WebSocket" : "Telemetry Status · Syncing (REST Fallback)"}
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

        {/* Agent Summary */}
        <div className="px-4 py-4 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-sm border border-slate-300/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Agent Summary
            </span>
          </div>
          <div className="space-y-2">
            {(["active", "idle", "error"] as const).map((status) => {
              const count = displayAgents.filter((a) => (a as any).status === status).length;
              const s = STATUS_STYLE[status];
              return (
                <div
                  key={status}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span className="font-mono text-[9px] text-slate-500 uppercase">{status}</span>
                  </div>
                  <span className={`font-mono text-[9px] font-bold ${s.cls.split(" ")[0]}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
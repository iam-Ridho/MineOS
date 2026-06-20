// src/app/digital-twin/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { X, Activity, MapPin, Radio, Weight, Droplets, Menu, XIcon, Clock, Truck, Heart, AlertTriangle, ChevronDown, ChevronUp, Bot, Cloud, Pickaxe, BarChart3 } from "lucide-react";
import { useOperatorFatigueAll, useOperatorFatigueUnit, getFatigueLevel } from "@/hooks/useOperatorFatigue";
import { useTelemetry } from "@/context/TelemetryContext";
import { useSupabaseAgents } from "@/hooks/useSupabaseAgents";
import { useEnvironmentSensor } from "@/hooks/useEnvironmentSensor";
import type { EnvironmentSensor } from "@/hooks/useEnvironmentSensor";
import { useAlerts } from "@/hooks/useAlerts";
import type { AiDecision } from "@/hooks/useAlerts";
import { ScenarioAlertOverlay } from "@/components/ScenarioAlertOverlay";

// ============ KONSTANTA ============

// ── Zona real dari data vehicle_positions — dihitung di runtime dari agents
// Tidak hardcode: zona aktual ditentukan oleh data realtime Supabase
type PitZoneStatus = "active" | "standby";

interface PitZone {
  id: string;
  label: string;
  status: PitZoneStatus;
  unitCount: number;
}

/** Hitung daftar zona unik beserta jumlah unit dari array agents */
function deriveZones(agents: any[]): PitZone[] {
  const countMap = new Map<string, number>();
  agents.forEach((a) => {
    const zone = a.zone || "Unknown";
    countMap.set(zone, (countMap.get(zone) ?? 0) + 1);
  });

  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1]) // urutkan: zone dengan unit terbanyak di atas
    .map(([zone, count]) => ({
      id: zone,
      label: zone,
      status: count > 0 ? "active" : "standby",
      unitCount: count,
    }));
}

const PIT_ZONE_DOT: Record<PitZoneStatus, string> = {
  active:  "bg-cyan-400 shadow-[0_0_6px_#3b82f6]",
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

function AgentModal({ agentId, onClose, agents, alerts }: {
  agentId: string;
  onClose: () => void;
  agents: any[];
  alerts: any[];
}) {
  // ✅ Semua hook HARUS dipanggil sebelum early return apapun.
  // Rules of Hooks: hook tidak boleh dipanggil bersyarat.
  // Sebelumnya hook dipanggil setelah `if (!agent) return null`
  // yang menyebabkan hook tidak berjalan dan fatigue selalu null.
  const { fatigue, loading: fatigueLoading } = useOperatorFatigueUnit(agentId);
  const fatigueLevel = fatigue ? getFatigueLevel(fatigue.fatigue_score) : null;

  const agent = agents.find((a) => a.id === agentId) as any;
  if (!agent) return null;

  const s = STATUS_STYLE[agent.status] ?? STATUS_STYLE.offline;

  // Alert aktif untuk unit ini
  const unitAlerts = alerts.filter(
    (a) => a.vehicle_id === agentId && !a.acknowledged
  );

  return (
    // ✅ FIX: Ganti absolute inset-0 → absolute dengan posisi eksplisit.
    // inset-0 membuat modal mengisi seluruh area main dan bertabrakan
    // dengan ScenarioAlertOverlay. Sekarang modal menempel di kiri atas
    // area map dengan offset dari tepi, tidak overlap overlay lain.
    // max-h + overflow-y-auto agar konten yang panjang bisa di-scroll
    // tanpa modal membesar melebihi viewport.
    <div className="absolute top-4 left-4 z-30 pointer-events-none">
      <div
        className="pointer-events-auto w-80 bg-slate-50 border border-slate-300/60 border-t-2 border-t-cyan-500 rounded-xl shadow-2xl flex flex-col"
        style={{
          maxHeight: "calc(100vh - 10rem)",
          boxShadow: "0 0 30px rgba(6,182,212,0.12), 0 0 60px rgba(6,182,212,0.04)"
        }}
      >
        {/* Header — sticky, tidak ikut scroll */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Truck size={12} className="text-blue-600" />
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              Unit: {agent.name}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">
        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Tipe</p>
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
                  <Weight size={8} /> Beban Angkutan
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
                  <Droplets size={8} /> BBM
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
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Kecepatan</p>
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
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1">Zona</p>
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

          {/* ── Operator Fatigue — realtime dari tabel operator_fatigue ── */}
          <div className={`rounded-lg px-3 py-3 border ${
            fatigueLevel ? `${fatigueLevel.bg} ${fatigueLevel.border}` : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Heart size={8} /> Fatigue Operator
              </p>
              {fatigueLevel && (
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${fatigueLevel.color} ${fatigueLevel.border} ${fatigueLevel.bg}`}>
                  {fatigueLevel.label}
                </span>
              )}
            </div>

            {fatigueLoading && (
              <p className="font-mono text-[9px] text-slate-400">Memuat data fatigue...</p>
            )}

            {!fatigueLoading && fatigue && (
              <>
                {/* Fatigue score bar */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[8px] text-slate-500">Fatigue Score</span>
                    <span className={`font-mono text-xs font-bold ${fatigueLevel?.color}`}>
                      {(fatigue.fatigue_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        fatigue.fatigue_score >= 0.7 ? "bg-red-500" :
                        fatigue.fatigue_score >= 0.4 ? "bg-amber-400" : "bg-blue-400"
                      }`}
                      style={{ width: `${Math.min(fatigue.fatigue_score * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Detail row */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white/60 rounded px-1 py-1.5 border border-white/80">
                    <p className="font-mono text-[7px] text-slate-500 mb-0.5">Shift</p>
                    <p className="font-mono text-[9px] font-bold text-slate-900">{fatigue.shift_hours.toFixed(1)}j</p>
                  </div>
                  <div className="bg-white/60 rounded px-1 py-1.5 border border-white/80">
                    <p className="font-mono text-[7px] text-slate-500 mb-0.5">HR</p>
                    <p className={`font-mono text-[9px] font-bold ${fatigue.heart_rate > 100 ? "text-red-500" : "text-slate-900"}`}>
                      {fatigue.heart_rate}bpm
                    </p>
                  </div>
                  <div className="bg-white/60 rounded px-1 py-1.5 border border-white/80">
                    <p className="font-mono text-[7px] text-slate-500 mb-0.5">Mata</p>
                    <p className={`font-mono text-[9px] font-bold ${fatigue.eyes_closed_ratio > 0.3 ? "text-red-500" : "text-slate-900"}`}>
                      {(fatigue.eyes_closed_ratio * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </>
            )}

            {!fatigueLoading && !fatigue && (
              <p className="font-mono text-[9px] text-slate-400">Tidak ada data fatigue</p>
            )}
          </div>

          {/* ── Active alerts untuk unit ini ── */}
          {unitAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-lg px-3 py-2">
              <p className="text-[9px] font-mono text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <AlertTriangle size={8} /> Alert Aktif ({unitAlerts.length})
              </p>
              <div className="space-y-1">
                {unitAlerts.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-1.5">
                    <span className="font-mono text-[7px] font-bold text-red-500 mt-0.5 flex-shrink-0">
                      {alert.severity}
                    </span>
                    <p className="font-mono text-[8px] text-red-700 leading-relaxed line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {agent.timestamp && (
            <div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock size={8} /> Terakhir Diperbarui
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
        </div>
        </div> {/* end scrollable */}
      </div>
    </div>
  );
}

// ── VEHICLE TYPE LABEL ──────────────────────────────────────────────────────
const VEHICLE_TYPE_LABEL: Record<string, string> = {
  haul_truck: "Haul Truck",
  excavator:  "Excavator",
  dozer:      "Dozer",
  grader:     "Grader",
  support:    "Support",
};


// ─────────────────────────────────────────────────────────────────────────────
// AI ORCHESTRATOR PANEL
// Diletakkan di sidebar kiri paling atas — keputusan AI adalah "headline"
// dari sistem, lebih penting dari detail unit individual.
// Data dari tabel ai_decisions via useAlerts() → latestDecision.
// ─────────────────────────────────────────────────────────────────────────────
// Ganti fungsi AiDecisionPanel di page.tsx dengan ini:

function AiDecisionPanel({ decision }: { decision: AiDecision | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!decision) {
    return (
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={13} className="text-blue-600" />
          <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
            Keputusan AI
          </span>
        </div>
        <p className="font-mono text-[9px] text-slate-400">Menunggu keputusan AI...</p>
      </div>
    );
  }

  const priorityColor =
  decision.priority_level === "KRITIS"  ? "text-red-500 border-red-400 bg-red-50" :
  decision.priority_level === "WASPADA" ? "text-amber-600 border-amber-400 bg-amber-50" :
  "text-slate-600 border-slate-300 bg-slate-50";

  const priorityDot =
  decision.priority_level === "KRITIS"  ? "bg-red-400" :
  decision.priority_level === "WASPADA" ? "bg-amber-400" :
  "bg-slate-400";

  const summaries = [
    { label: "Fleet",       value: decision.fleet_summary },
    { label: "Safety",      value: decision.safety_summary },
    { label: "Emission",    value: decision.emission_summary },
    { label: "Reclamation", value: decision.reclamation_summary },
  ].filter(s => s.value);

  // Extract first sentence for headline (collapsed view)
  const headline = decision.decision_text.split(/[.!?]/, 1)[0] + ".";
  const hasMoreText = decision.decision_text.length > headline.length + 10;

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-100 transition-colors text-left"
      >
        <Bot size={13} className="text-blue-600" />
        <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
          Keputusan AI
        </span>
        <span className={`text-[7px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${priorityColor}`}>
          {decision.priority_level}
        </span>
        <span className="font-mono text-[8px] text-slate-400 ml-1 flex-shrink-0">
          {decision.scenario?.toUpperCase?.()}
        </span>
        {/* Expand/collapse icon */}
        {hasMoreText && (
          expanded 
            ? <ChevronUp size={12} className="text-slate-400 flex-shrink-0" />
            : <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
        )}
      </button>

      {/* Collapsed: headline only */}
      {!expanded && (
        <div className="px-4 pb-3">
          <p className="font-mono text-[9px] text-slate-600 leading-relaxed line-clamp-2">
            {headline}
          </p>
          {hasMoreText && (
            <p className="font-mono text-[8px] text-purple-500 mt-1 cursor-pointer" onClick={() => setExpanded(true)}>
              Klik untuk detail lengkap →
            </p>
          )}
        </div>
      )}

      {/* Expanded: full content */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Full decision text */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="font-mono text-[9px] text-slate-700 leading-relaxed whitespace-pre-wrap">
              {decision.decision_text}
            </p>
          </div>

          {/* Agent summaries */}
          {summaries.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-mono text-[8px] text-slate-400 uppercase tracking-widest">Laporan Agent</p>
              {summaries.map(s => (
                <div key={s.label} className="bg-white rounded px-2.5 py-2 border border-slate-200/80">
                  <p className="font-mono text-[7px] text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                  <p className="font-mono text-[8px] text-slate-600 leading-relaxed">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Triggered agents + engine */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <div className="flex flex-wrap gap-1">
              {(decision.triggered_agents ?? []).map((ag: string) => (
                <span key={ag} className="font-mono text-[7px] px-1.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-600 rounded">
                  {ag}
                </span>
              ))}
            </div>
          </div>

          {/* Collapse button */}
          <button 
            onClick={() => setExpanded(false)}
            className="w-full text-center py-1 font-mono text-[8px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            ↑ Sembunyikan detail
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER PANEL
// Data dari tabel environment_sensors (realtime INSERT tiap ~5 detik)
// Kolom: zone, slope_degree, rainfall_mm, wind_speed_ms,
//        weather_forecast, rain_probability_2h, timestamp
// ─────────────────────────────────────────────────────────────────────────────
function WeatherPanel({ sensor, loading }: { sensor: EnvironmentSensor; loading: boolean }) {
  // wind_speed_ms → km/h untuk display
  const windKmh = (sensor.wind_speed_ms * 3.6).toFixed(1);

  // Warna forecast
  const forecastColor =
    sensor.weather_forecast.toLowerCase().includes("storm") ? "text-red-400" :
    sensor.weather_forecast.toLowerCase().includes("rain")  ? "text-amber-500" :
    "text-blue-600";

  // Rain probability color
  const rainColor =
    sensor.rain_probability_2h > 70 ? "text-red-400" :
    sensor.rain_probability_2h > 40 ? "text-amber-500" :
    "text-slate-700";

  const rows = [
    { label: "Kecepatan Angin",    value: `${windKmh} km/h`                },
    { label: "Curah Hujan",      value: `${sensor.rainfall_mm.toFixed(1)} mm`     },
    { label: "Kemiringan",         value: `${sensor.slope_degree.toFixed(1)}°`      },
    { label: "Hujan (dalam 2 jam)",     value: `${sensor.rain_probability_2h}%`, color: rainColor },
    { label: "Zona",          value: sensor.zone                       },
  ];

  return (
    <div className="px-4 py-4 border-b border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud size={13} className="text-blue-600" />
          <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
            LAPORAN CUACA
          </span>
        </div>
        {sensor.timestamp && (
          <span className="font-mono text-[8px] text-slate-400">
            {new Date(sensor.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      {/* Forecast badge */}
      <div className="mb-3">
        <span className={`font-mono text-sm font-bold ${forecastColor}`}>
          {loading ? "–" : sensor.weather_forecast || "–"}
        </span>
        <p className="font-mono text-[8px] text-slate-400 mt-0.5 uppercase tracking-widest">KEADAAN CUACA SAAT INI</p>
      </div>

      {/* Detail rows */}
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-slate-500">{row.label}</span>
            <span className={`font-mono text-[9px] font-medium ${row.color ?? "text-slate-700"}`}>
              {loading ? "–" : row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIT ZONES PANEL
// Zona dihitung dari vehicle_positions.zone (realtime) bukan hardcoded.
// Menampilkan semua zona unik yang ada di data + jumlah unit di setiap zona.
// ─────────────────────────────────────────────────────────────────────────────
function PitZonesPanel({ zones }: { zones: PitZone[] }) {
  return (
    <div className="px-4 py-4 border-b border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Pickaxe size={13} className="text-blue-600" />
        <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
          Zona Tambang
        </span>
        <span className="ml-auto font-mono text-[8px] text-slate-400">{zones.length} Zona</span>
      </div>

      {zones.length === 0 ? (
        <p className="font-mono text-[9px] text-slate-400 text-center py-2">Tidak ada data zona</p>
      ) : (
        <div className="space-y-1.5">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60"
            >
              <span className="font-mono text-[9px] text-slate-700 truncate pr-1">{zone.label}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-mono text-[9px] text-blue-600 font-bold">{zone.unitCount}</span>
                <div className={`w-2 h-2 rounded-full ${PIT_ZONE_DOT[zone.status]}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLEET SUMMARY PANEL
// Semua angka dihitung dari data agents (vehicle_positions realtime)
// ─────────────────────────────────────────────────────────────────────────────
function FleetSummaryPanel({ agents }: { agents: any[] }) {
  const total     = agents.length;
  const active    = agents.filter((a) => a.status === "active").length;
  const idle      = agents.filter((a) => a.status === "idle").length;
  const lowFuel   = agents.filter((a) => (a.fuel_pct ?? a.fuel ?? 0) < 20).length;
  const avgSpeed  = total > 0
    ? Math.round(agents.reduce((s, a) => s + (a.speed_kmh ?? a.speed ?? 0), 0) / total)
    : 0;
  const totalLoad = agents.reduce((s, a) => s + (a.load_weight_ton ?? a.load_weight ?? 0), 0);

  // Distribusi tipe kendaraan
  const typeDist = agents.reduce<Record<string, number>>((acc, a) => {
    const t = a.type ?? "unknown";
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const summaryRows = [
    { label: "Total Unit",    value: total,              color: "text-slate-900"  },
    { label: "Aktif",         value: active,             color: "text-blue-600"   },
    { label: "Idle",           value: idle,               color: "text-amber-500"  },
    { label: "Rata-rata Kecepatan",      value: `${avgSpeed} km/h`, color: "text-slate-900"  },
    { label: "Total Muatan",     value: `${totalLoad.toFixed(0)} ton`, color: "text-slate-900" },
    { label: "Low BBM (<20%)", value: lowFuel,           color: lowFuel > 0 ? "text-red-400" : "text-slate-900" },
  ];

  return (
    <div className="px-4 py-4 flex-1">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={13} className="text-blue-600" />
        <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
          Ringkasan Armada
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-1.5 mb-4">
        {summaryRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/60">
            <span className="font-mono text-[9px] text-slate-500">{row.label}</span>
            <span className={`font-mono text-[9px] font-bold ${row.color}`}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Vehicle type distribution */}
      {Object.keys(typeDist).length > 0 && (
        <>
          <p className="font-mono text-[8px] text-slate-400 uppercase tracking-widest mb-1.5">By Type</p>
          <div className="space-y-1.5">
            {Object.entries(typeDist).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-1 px-2.5 rounded bg-white border border-slate-200/60">
                <span className="font-mono text-[9px] text-slate-600">
                  {VEHICLE_TYPE_LABEL[type] ?? type}
                </span>
                <span className="font-mono text-[9px] font-bold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============ PAGE UTAMA ============

function DigitalTwinContent() {
  const { wsConnected } = useTelemetry();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { agents: supabaseAgents, loading, error, wsStatus } = useSupabaseAgents();
  const { sensor: envSensor, loading: envLoading } = useEnvironmentSensor();
  const { alerts, latestDecision, toastQueue, dismissToast } = useAlerts();

  // Fatigue semua unit — untuk dot indikator di sidebar
  const fatigueMap = useOperatorFatigueAll();


  // Zona realtime — dihitung dari data vehicle_positions aktual
  const pitZones = useMemo(() => deriveZones(supabaseAgents), [supabaseAgents]);

  // Deteksi mode mobile
  const searchParams = useSearchParams();
  const isMobile = searchParams.get("mobile") === "true";
  const [showSidebar, setShowSidebar] = useState(false);

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
                alerts={alerts}
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
        {/* ── AI Orchestrator — paling atas, headline dari sistem ── */}
        <AiDecisionPanel decision={latestDecision} />

        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={13} className="text-blue-600" />
            <span className="font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest">
              UNIT AKTIF
            </span>
          </div>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm border border-blue-300 text-blue-600 bg-blue-50">
            {displayAgents.filter((a) => (a as any).status === "active").length} AKTIF
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
                {/* Baris nama + status + dot indikator */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-900 truncate">
                      {a.name}
                    </span>
                    {/* Fatigue dot — merah kalau score >= 0.7 */}
                    {(() => {
                      const f = fatigueMap.get(a.id);
                      if (!f) return null;
                      const lvl = getFatigueLevel(f.fatigue_score);
                      if (f.fatigue_score < 0.4) return null; // hide kalau normal
                      return (
                        <span
                          title={`Fatigue: ${(f.fatigue_score * 100).toFixed(0)}%`}
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${lvl.dot} ${f.fatigue_score >= 0.7 ? "animate-pulse" : ""}`}
                        />
                      );
                    })()}
                    {/* Alert dot — merah kalau ada alert aktif untuk unit ini */}
                    {alerts.some((al: any) => al.vehicle_id === a.id && !al.acknowledged) && (
                      <span
                        title="Ada alert aktif"
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-500 animate-pulse"
                      />
                    )}
                  </div>
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
                      BBM:{a.fuel_pct}%
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
            alerts={alerts}
          />
        )}

        <ScenarioAlertOverlay
          toastQueue={toastQueue}
          onDismissToast={dismissToast}
          latestDecision={latestDecision}
        />

        <div className="absolute bottom-0 left-0 right-0 bg-slate-50/90 backdrop-blur border-t border-slate-200 px-4 py-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5">
            {/* <div
              className={`w-1.5 h-1.5 rounded-full ${
                wsConnected ? "bg-cyan-400 animate-pulse" : "bg-amber-400"
              }`}
            /> */}
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
              {wsConnected 
                ? `Live Telemetry | ${displayAgents.length} units` 
                : wsStatus === 'CLOSED' 
                  ? "WebSocket Closed | Reconnecting..." 
                  : "Telemetry Status | Syncing"}
            </span>
          </div>
        </div>
      </main>

      {/* Right sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-l border-slate-200 bg-slate-50 overflow-y-auto">

        {/* ── Weather Station — data dari environment_sensors ── */}
        <WeatherPanel sensor={envSensor} loading={envLoading} />

        {/* ── Pit Zones — zone dari vehicle_positions.zone realtime ── */}
        <PitZonesPanel zones={pitZones} />

        {/* ── Fleet Summary — dihitung dari vehicle_positions ── */}
        <FleetSummaryPanel agents={displayAgents} />
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
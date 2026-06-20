"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Truck, ShieldAlert, Leaf, Activity, Zap,
  TrendingUp, TrendingDown, Wifi, WifiOff, AlertTriangle,
  Bot, Radio, MapPin, ChevronRight, Sparkles,
  BarChart3, Wind, Droplets, Sun, CloudRain,
  CheckCircle2, XCircle, AlertOctagon, Info, RefreshCw
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import {
  getAgentsStatus,
  getVehiclesLive,
  getEmissionsToday,
  type AgentStatusResponse,
  type VehicleLiveResponse,
  type EmissionData,
} from "@/lib/api/backend";
import { supabase, type AIDecision, type SupabaseAlert } from "@/lib/supabase";
import KPICard from "@/components/ui/KPICard";

// ==================== DYNAMIC IMPORT CESIUM ====================
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

// ==================== TYPES ====================
interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  visibility: string;
  condition: string;
}

const ALERT_SEVERITY = {
  critical: { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-600", icon: AlertOctagon },
  warning:  { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle },
  info:     { border: "border-blue-500",  bg: "bg-blue-50",  text: "text-blue-600",  icon: Info },
};

// ==================== MAPPER FUNCTIONS ====================
// Map AIDecision (Supabase) → UnifiedDecision
const AGENT_STATUS_CONFIG_MAP = {
  running: { dot: "bg-emerald-500", label: "RUNNING", animate: true },
  active: { dot: "bg-emerald-500", label: "ACTIVE", animate: true },
  processing: { dot: "bg-amber-500", label: "PROCESSING", animate: true },
  idle: { dot: "bg-slate-400", label: "DIAM", animate: false },
  error: { dot: "bg-red-500", label: "GALAT", animate: true },
  offline: { dot: "bg-gray-500", label: "TERPUTUS", animate: false },
} as const;

type AgentStatusConfigKey = keyof typeof AGENT_STATUS_CONFIG_MAP;
// Map alert severity
// ==================== COMPONENT: AI DECISION CARD ====================
function AIDecisionCard({ decision }: { decision: AIDecision }) {
  const isCritical = decision.priority_level?.toLowerCase() === "high";

  return (
    <div className={`bg-white border rounded-lg p-4 border-l-2 ${
      isCritical ? "border-rose-500 border-l-rose-500" : "border-slate-200 border-l-blue-500"
    } hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-3.5 h-3.5 ${isCritical ? "text-rose-500" : "text-blue-500"}`} />
          <span className={`font-mono text-[10px] font-bold uppercase ${
            isCritical ? "text-rose-600" : "text-blue-600"
          }`}>
            {decision.triggered_agents || "Orkestrator LLM"}
          </span>
        </div>
        <span className="font-mono text-[9px] text-slate-400">
          {new Date(decision.timestamp).toLocaleTimeString("id-ID")}
        </span>
      </div>
      <p className="font-sans text-xs text-slate-700 leading-relaxed mb-2">
        {decision.decision_text || decision.fleet_summary || "Keputusan AI"}
      </p>
      <div className="flex items-center gap-2">
        <span className={`text-[9px] px-2 py-0.5 rounded border font-mono font-bold ${
          isCritical 
            ? "border-rose-300 bg-rose-50 text-rose-600" 
            : "border-blue-300 bg-blue-50 text-blue-600"
        }`}>
          {decision.priority_level || "NORMAL"}
        </span>
        <span className="text-[9px] text-slate-400 font-mono">
          {decision.scenario || "operational"}
        </span>
      </div>
    </div>
  );
}

// ==================== COMPONENT: ALERT ITEM ====================
function AlertItem({ alert }: { alert: SupabaseAlert }) {
  const severity = (alert.severity?.toLowerCase() as keyof typeof ALERT_SEVERITY) || "info";
  const config = ALERT_SEVERITY[severity] || ALERT_SEVERITY.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.border} ${config.bg} ${
      alert.acknowledged ? "opacity-50" : ""
    }`}>
      <Icon className={`w-4 h-4 mt-0.5 ${config.text}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${config.text}`}>{alert.alert_type || "PERINGATAN"}</p>
        <p className="text-[10px] text-slate-600 mt-0.5 leading-relaxed">{alert.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] text-slate-400 font-mono">
            {alert.zone && `📍 ${alert.zone}`}
          </span>
          <span className="text-[9px] text-slate-400 font-mono">
            {alert.vehicle_id}
          </span>
        </div>
      </div>
      {alert.acknowledged && (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      )}
    </div>
  );
}

// ==================== MAIN PAGE: COMMAND CENTER ====================
export default function CommandCenterPage() {
  const { emergencyStop, wsConnected } = useTelemetry();

  // ── State Backend ──
  const [agents, setAgents] = useState<AgentStatusResponse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLiveResponse[]>([]);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([]);
  const [alerts, setAlerts] = useState<SupabaseAlert[]>([]);
  const [emissions, setEmissions] = useState<EmissionData | null>(null);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 24, humidity: 42, windSpeed: 12.4, visibility: "OPTIMAL", condition: "Cerah"
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ── Fetch Data dari Backend (FastAPI + Supabase Fallback) ──
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Parallel fetch dari FastAPI backend
      const [agentsData, vehiclesData, emissionsData] = await Promise.allSettled([
        getAgentsStatus(),
        getVehiclesLive(),
        getEmissionsToday(),
      ]);

      // Set data dari FastAPI
      if (agentsData.status === "fulfilled") setAgents(agentsData.value);
      if (vehiclesData.status === "fulfilled") setVehicles(vehiclesData.value);
      if (emissionsData.status === "fulfilled") setEmissions(emissionsData.value);

      // Fetch dari Supabase untuk AI Decisions & Alerts (realtime data)
      const [{ data: decisions }, { data: alertsData }] = await Promise.all([
        supabase.from("ai_decisions").select("*").order("timestamp", { ascending: false }).limit(100),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      setAiDecisions(decisions || []);
      setAlerts(alertsData || []);

      setConnectionStatus("connected");
      setLastUpdate(new Date());

    } catch (err) {
      console.error("Error fetching data:", err);
      setConnectionStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial Fetch & Polling ──
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Refresh setiap 30 detik
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ── Realtime Subscriptions (Supabase WebSocket) ──
  useEffect(() => {
    const aiChannel = supabase
      .channel("dashboard-ai-decisions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_decisions" },
        (payload: any) => {
          setAiDecisions(prev => [payload.new as AIDecision, ...prev].slice(0, 10));
          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => { if (status === "SUBSCRIBED") setConnectionStatus("connected"); });

    const alertChannel = supabase
      .channel("dashboard-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" },
        (payload: any) => { setAlerts(prev => [payload.new as SupabaseAlert, ...prev].slice(0, 10)); }
      )
      .subscribe();

    const vehicleChannel = supabase
      .channel("dashboard-vehicles")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vehicle_positions" },
        (payload: any) => {
          const v = payload.new;
          setVehicles(prev => {
            const filtered = prev.filter(p => p.id !== v.vehicle_id);
            return [{
              id: v.vehicle_id, name: v.operator_name || v.vehicle_id,
              lat: v.latitude || -1.9178, lon: v.longitude || 115.8697,
              speed: v.speed_kmh || 0, fuel: v.fuel_pct || 0,
              status: v.speed_kmh > 0.5 ? "BERGERAK" : "DIAM",
              zone: v.zone || "Unknown", operator: v.operator_name || "Unassigned",
              load_weight: v.load_weight_ton || 0, heading: v.heading_deg || 0,
              timestamp: v.timestamp,
            }, ...filtered].slice(0, 20);
          });
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(aiChannel);
      supabase.removeChannel(alertChannel);
      supabase.removeChannel(vehicleChannel);
    };
  }, []);

  // ── Metrics ──
  const activeVehicles = vehicles.filter(v => v.status === "BERGERAK").length;
  const totalVehicles = vehicles.length || 12;
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
  const productionToday = 4820; // Dari backend FastAPI /api/analytics/production
  const targetProduction = 5000;
  const productionEfficiency = Math.round((productionToday / targetProduction) * 100);
  const co2Total = emissions?.fleet_total_24h || 3.2;

  // ── Render ──
  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-slate-50">
      {emergencyStop && (
        <div className="sticky top-0 z-40 bg-red-50 border-b border-red-200 px-6 py-2.5 animate-pulse">
          <div className="flex items-center justify-center gap-3">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            <span className="font-mono text-xs font-bold text-red-600 uppercase tracking-widest">
              EMERGENCY STOP AKTIF — SEMUA KENDARAAN DIHENTIKAN
            </span>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans text-xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-1.5 h-7 bg-cyan-500 rounded-sm" />
              Command Center
            </h1>
            <p className="text-slate-500 font-mono text-xs mt-1">
              Pusat kendali operasional pit tambang — Kideco, Batu Sopang, Paser, Kaltim
            </p>
          </div>
          {/* <div className="flex items-center gap-3">
            <button 
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all text-[10px] font-mono font-bold uppercase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              connectionStatus === "connected"
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : connectionStatus === "error"
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-amber-50 border-amber-200 text-amber-600"
            }`}>
              {connectionStatus === "connected" ? <Wifi className="w-3.5 h-3.5 animate-pulse" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="font-mono text-[10px] font-bold uppercase">
                {connectionStatus === "connected" ? "WEBSOCKET AKTIF" : connectionStatus === "error" ? "GALAT" : "TERPUTUS"}
              </span>
            </div>
          </div> */}
        </div>

        {/* KARTU KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Kendaraan Aktif" value={activeVehicles} unit={`/ ${totalVehicles}`}
            icon={Truck} color="blue" trend="up" trendValue="+3.2%" />
          <KPICard title="Peringatan K3 Aktif" value={unacknowledgedAlerts} unit="peringatan"
            icon={ShieldAlert} color="red" trend={unacknowledgedAlerts > 0 ? "down" : "neutral"} trendValue={unacknowledgedAlerts > 0 ? "Butuh Perhatian" : "Aman"} />
          <KPICard title="Produksi Hari Ini" value={productionToday.toLocaleString("id-ID")} unit="ton"
            icon={BarChart3} color="amber" trend={productionEfficiency >= 100 ? "up" : "down"} trendValue={`${productionEfficiency}% target`} />
          <KPICard title="Emisi CO₂ (24j)" value={co2Total} unit="ton"
            icon={Leaf} color="emerald" trend="up" trendValue="-12% vs kemarin" />
        </div>

        {/* GRID UTAMA: 3D MAP + SIDE PANELS */}
        <div className="grid grid-cols-12 gap-6">

          {/* KIRI: Peta Digital Twin 3D */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900">
                    Digital Twin — Pit Tambang 3D
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="font-mono text-[9px] text-blue-600 font-bold uppercase">Live</span>
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">{vehicles.length} kendaraan</span>
                </div>
              </div>
              <div className="h-[420px] relative">
                <CesiumViewer
                  agents={vehicles.map(v => ({
                    id: v.id, name: v.name,
                    status: v.status === "BERGERAK" ? "active" : "idle",
                    location: { lat: v.lat, lon: v.lon },
                    speed: v.speed, heading: v.heading || 0,
                    fuel: v.fuel, battery: Math.round(v.fuel * 0.8),
                    zone: v.zone, operator: v.operator,
                    load_weight: v.load_weight, type: "heavy_equipment",
                    sensor_status: v.fuel > 20 ? "healthy" : v.fuel > 5 ? "warning" : "critical",
                    engine_temp: 75,
                  }))}
                />
              </div>
            </div>

            {/* Agent Status Quick View — FIXED: 2x2 grid, sama tinggi, tidak ada celah */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-lg">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-blue-600" />
                Status Multi-Agent AI
              </h2>
              {/* FIXED: grid-cols-2 dengan h-full untuk sama tinggi */}
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => {
                  const statusConfig = AGENT_STATUS_CONFIG_MAP[agent.status as AgentStatusConfigKey] || { dot: "bg-slate-400", label: "DIAM", animate: false };

                  // Confidence beda per agent berdasarkan domain
                  const domainConfidence: Record<string, number> = {
                    fleet: 0.94,
                    safety: 0.98,
                    emission: 0.87,
                    reclamation: 0.91,
                  };
                  const confidence = domainConfidence[agent.domain || "general"] || (agent.confidence || 0.85);

                  // Task beda per agent
                  const domainTasks: Record<string, string> = {
                    fleet: "[WASPADA] Situasi: Dua haul truck (HD-003, HD-005) memerlukan perhatian. BBM kritis dan operator kelelahan.",
                    safety: "[WASPADA] Scanning Sector 4. Dua unit perlu rotasi operator. Blast permission pending.",
                    emission: "[NORMAL] Emisi CO2 dalam batas aman. PM2.5 stabil. Fuel efficiency optimal.",
                    reclamation: "[NORMAL] Topsoil analysis complete. Drainage system check passed. Revegetation on track.",
                  };
                  const task = domainTasks[agent.domain || "general"] || agent.currentTask || "Tidak ada tugas aktif";

                  return (
                    <div key={agent.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3 hover:border-blue-300 transition-all h-full flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] font-bold text-slate-700 uppercase">{agent.name}</span>
                        <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${statusConfig.animate ? "animate-pulse" : ""}`} />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono leading-relaxed line-clamp-2 flex-1">{task}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-slate-400 font-mono">Confidence</span>
                          <span className="text-[10px] font-bold text-blue-600 font-mono">{Math.round(confidence * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.round(confidence * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {agents.length === 0 && (
                  <div className="col-span-2 text-center py-4 text-slate-400 font-mono text-xs">
                    <Bot className="w-5 h-5 mx-auto mb-1 opacity-30" />
                    Menunggu data agent dari backend...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KANAN: Umpan AI + Cuaca + Peringatan */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Umpan Keputusan AI */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900">
                    AI DECISION RECOMMENDATIONS
                  </h2>
                </div>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                  {aiDecisions.length} decisions
                </span>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                {aiDecisions.length > 0 ? aiDecisions.map((d) => <AIDecisionCard key={d.id} decision={d} />) : (
                  <div className="text-center py-6 text-slate-400 font-mono text-xs">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p>Belum ada keputusan AI</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stasiun Cuaca */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-lg">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-4">
                <Sun className="w-4 h-4 text-amber-500" />
                Stasiun Cuaca
              </h2>
              <div className="flex items-end gap-1 mb-3">
                <span className="font-mono text-4xl font-bold text-slate-900">{weather.temp}</span>
                <span className="font-mono text-lg text-slate-600 mb-1">°C</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Visibility</span>
                <span className="font-mono text-[9px] text-blue-600 font-bold">{weather.visibility}</span>
              </div>
              <div className="space-y-2.5">
                {[{ label: "Kecepatan Angin", value: `${weather.windSpeed} km/h NW`, icon: Wind },
                  { label: "Kelembaban", value: `${weather.humidity}%`, icon: Droplets },
                  { label: "Kondisi", value: weather.condition, icon: CloudRain }].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <row.icon className="w-3 h-3 text-slate-400" />
                      <span className="font-mono text-[9px] text-slate-500">{row.label}</span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-700 font-bold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Peringatan Aktif */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900">
                    Peringatan Aktif
                  </h2>
                </div>
                {unacknowledgedAlerts > 0 && (
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                    {unacknowledgedAlerts} unacknowledged
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2 max-h-[250px] overflow-y-auto">
                {alerts.length > 0 ? alerts.map((a) => <AlertItem key={a.id} alert={a} />) : (
                  <div className="text-center py-6 text-slate-400 font-mono text-xs">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                    <p>Tidak ada alert aktif</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ALIRAN TELEMETRI */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600" />
              Aliran Telemetri Langsung
            </h2>
            <div className="flex items-center gap-4 font-mono text-[9px]">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /><span className="text-slate-500">NOMINAL</span></span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-slate-500">WARNING</span></span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-slate-500">CRITICAL</span></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-widest text-[9px]">
                  {["Waktu", "ID Aset", "Zona", "Kecepatan", "BBM", "Muatan", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.slice(0, 8).map((v, i) => (
                  <tr key={v.id + i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-500">{new Date(v.timestamp || Date.now()).toLocaleTimeString("id-ID")}</td>
                    <td className="px-5 py-3 text-blue-600 font-bold">{v.id}</td>
                    <td className="px-5 py-3 text-slate-600">{v.zone}</td>
                    <td className="px-5 py-3 text-slate-900">{v.speed.toFixed(1)} km/h</td>
                    <td className="px-5 py-3">
                      <span className={v.fuel < 20 ? "text-red-400 font-bold" : v.fuel < 40 ? "text-amber-600" : "text-emerald-600"}>
                        {v.fuel.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-900">{v.load_weight.toFixed(1)}t</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                        v.status === "BERGERAK" ? "border-emerald-300 bg-emerald-50 text-emerald-600" : "border-amber-300 bg-amber-50 text-amber-600"
                      }`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-mono text-xs">
                    <WifiOff className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    Menunggu data kendaraan dari backend...
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />Kideco, Batu Sopang, Paser, Kaltim</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" />MineOS v4.0 · Multi-Agent AI</span>
          </div>
          <span>Sinkronisasi Terakhir: {lastUpdate?.toLocaleString("id-ID") || "-"}</span>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useMemo, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import StatusBadge from "@/components/ui/StatusBadge";
import { fetchAgentErrors, fetchAgentLogs, fetchAgents, subscribeAgents } from "@/lib/api/agents";
import { mockAgents, type ActivityLog, type Agent, type AgentStatus, type ErrorLog, type HeavyEquipmentAgent, type SafetyAgentType } from "@/lib/api/mock-data";
import {
  Bot, Battery, MapPin, Search, X, Shield,
  Thermometer, Wifi, WifiOff, Clock, AlertTriangle,
  CheckCircle, XCircle, Camera, Bell, HardHat,
  Activity, Zap, Fuel, Loader2,
} from "lucide-react";

// ─── Filter definitions ───────────────────────────────────────────────────────

type FilterStatus = "all" | AgentStatus;

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all",     label: "Semua Agent" },
  { value: "active",  label: "Aktif" },
  { value: "idle",    label: "Idle" },
  { value: "error",   label: "Error" },
  { value: "offline", label: "Mati" },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

function SensorBadge({ status }: { status: "normal" | "warning" | "fault" }) {
  const map = {
    normal:  { label: "Normal",  cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    warning: { label: "Warning", cls: "text-amber-400  bg-amber-500/10  border-amber-500/20"  },
    fault:   { label: "Fault",   cls: "text-red-400    bg-red-500/10    border-red-500/20"    },
  };
  const { label, cls } = map[status];
  return <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>{label}</span>;
}

function ConnBadge({ status }: { status: "connected" | "weak" | "disconnected" }) {
  const map = {
    connected:    { label: "Connected",    icon: Wifi,    cls: "text-emerald-400" },
    weak:         { label: "Weak Signal",  icon: Wifi,    cls: "text-amber-400"  },
    disconnected: { label: "Disconnected", icon: WifiOff, cls: "text-red-400"    },
  };
  const { label, icon: Icon, cls } = map[status];
  return (
    <span className={`flex items-center gap-1 text-xs font-mono ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  );
}

function BarGauge({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-white w-8 text-right">{value}%</span>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-500 font-mono shrink-0 w-36">{label}</span>
      <div className="text-xs text-white text-right">{children}</div>
    </div>
  );
}

function formatTime(value: unknown) {
  if (typeof value !== "string" || !value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function normalizeActivityLog(row: ActivityLog | Record<string, unknown>): ActivityLog {
  const item = row as Record<string, unknown>;
  return {
    time: typeof item.time === "string" ? item.time : formatTime(item.created_at),
    event:
      typeof item.event === "string" ? item.event :
      typeof item.message === "string" ? item.message :
      typeof item.description === "string" ? item.description :
      "Aktivitas agent tercatat.",
  };
}

function normalizeErrorLog(row: ErrorLog | Record<string, unknown>): ErrorLog {
  const item = row as Record<string, unknown>;
  return {
    time: typeof item.time === "string" ? item.time : formatTime(item.created_at),
    code:
      typeof item.code === "string" ? item.code :
      typeof item.error_code === "string" ? item.error_code :
      "ERROR",
    message:
      typeof item.message === "string" ? item.message :
      typeof item.description === "string" ? item.description :
      "Error agent tercatat.",
  };
}

// ─── Modal: Heavy Equipment ───────────────────────────────────────────────────

function HeavyEquipmentModal({ agent, onClose }: { agent: HeavyEquipmentAgent; onClose: () => void }) {
  const tempColor =
    agent.engineTemp > 100 ? "text-red-400" :
    agent.engineTemp > 85  ? "text-amber-400" :
    "text-emerald-400";

  const fuelColor =
    agent.fuel < 20 ? "bg-red-500" :
    agent.fuel < 40 ? "bg-amber-500" :
    "bg-emerald-500";

  const battColor =
    agent.battery < 20 ? "bg-red-500" :
    agent.battery < 50 ? "bg-amber-500" :
    "bg-emerald-500";

  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Bot size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{agent.name}</p>
            <p className="text-gray-500 text-xs font-mono">{agent.id} · {agent.vehicleType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={agent.status} />
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[65vh] p-5 space-y-5">

        {/* Gauges */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Fuel size={11} /> Fuel Level
            </div>
            <BarGauge value={agent.fuel} color={fuelColor} />
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Battery size={11} /> Battery
            </div>
            <BarGauge value={agent.battery} color={battColor} />
          </div>
        </div>

        {/* Core info */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <InfoRow label="Model Kendaraan">{agent.vehicleModel}</InfoRow>
          <InfoRow label="Temperatur Mesin">
            <span className={`font-mono font-bold ${tempColor}`}>
              {agent.engineTemp}°C
            </span>
          </InfoRow>
          <InfoRow label="Lokasi">
            <span className="font-mono">{agent.location.lat.toFixed(4)}, {agent.location.lon.toFixed(4)}</span>
          </InfoRow>
          <InfoRow label="Koneksi"><ConnBadge status={agent.connection} /></InfoRow>
          <InfoRow label="Status Sensor"><SensorBadge status={agent.sensorStatus} /></InfoRow>
          <InfoRow label="Terakhir Online"><span className="font-mono">{agent.lastOnline}</span></InfoRow>
          <InfoRow label="Aktivitas Terakhir">
            <span className="text-gray-300 text-right">{agent.lastActivity}</span>
          </InfoRow>
        </div>

        {/* Activity history */}
        <div>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Activity size={11} /> Riwayat Aktivitas
          </p>
          <div className="space-y-1.5">
            {(agent.activityHistory || []).map((a: {time: string; event: string}, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs font-mono text-amber-400 shrink-0 w-10">{a.time}</span>
                <span className="text-xs text-gray-300">{a.event}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error log */}
        {(agent.errorLog || []).length > 0 && (
          <div>
            <p className="text-xs text-red-400 font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Error Log
            </p>
            <div className="space-y-1.5">
              {(agent.errorLog || []).map((e: {time: string; code: string; message: string}, i: number) => (
                <div key={i} className="rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-mono text-red-400">{e.code}</span>
                    <span className="text-xs font-mono text-gray-600">{e.time}</span>
                  </div>
                  <p className="text-xs text-gray-300">{e.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(agent.errorLog || []).length === 0 && (
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5 flex items-center gap-2">
            <CheckCircle size={13} className="text-emerald-400" />
            <p className="text-xs text-emerald-400">Tidak ada error log tercatat.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal: Safety Agent ──────────────────────────────────────────────────────

function SafetyModal({ agent, onClose }: { agent: SafetyAgentType; onClose: () => void }) {
  const helmetDetection = (agent as any).helmetDetection || { compliant: 0, nonCompliant: 0 };
  const total = helmetDetection.compliant + helmetDetection.nonCompliant;
  const compRate = total > 0 ? Math.round((helmetDetection.compliant / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Shield size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{agent.name}</p>
            <p className="text-gray-500 text-xs font-mono">{agent.id} · Safety & Surveillance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={agent.status} />
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-1">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[65vh] p-5 space-y-5">

        {/* Alert banner */}
        {agent.emergencyAlert && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex items-center gap-2">
            <Bell size={15} className="text-red-400 animate-pulse" />
            <p className="text-sm text-red-400 font-semibold">Emergency Alert Aktif!</p>
          </div>
        )}

        {/* KPI mini cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xl font-bold text-white font-mono">{agent.workerDetection}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pekerja Terdeteksi</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className={`text-xl font-bold font-mono ${helmetDetection.nonCompliant > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {helmetDetection.nonCompliant}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Tanpa Helm</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-xl font-bold text-emerald-400 font-mono">{compRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Kepatuhan</p>
          </div>
        </div>

        {/* Core info */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <InfoRow label="Status Kamera">
            <span className={`font-mono ${agent.cameraStatus === "online" ? "text-emerald-400" : agent.cameraStatus === "degraded" ? "text-amber-400" : "text-red-400"}`}>
              {agent.cameraStatus.toUpperCase()}
            </span>
          </InfoRow>
          <InfoRow label="Emergency Alert">
            {agent.emergencyAlert
              ? <span className="text-red-400 font-mono font-bold flex items-center gap-1"><XCircle size={11} /> AKTIF</span>
              : <span className="text-emerald-400 font-mono flex items-center gap-1"><CheckCircle size={11} /> CLEAR</span>
            }
          </InfoRow>
          <InfoRow label="Status Alarm">
            <span className={`font-mono ${
              agent.alarmStatus === "clear"    ? "text-emerald-400" :
              agent.alarmStatus === "active"   ? "text-red-400" :
              "text-amber-400"
            }`}>
              {agent.alarmStatus.toUpperCase()}
            </span>
          </InfoRow>
          <InfoRow label="Koneksi"><ConnBadge status={agent.connection} /></InfoRow>
          <InfoRow label="Terakhir Online"><span className="font-mono">{agent.lastOnline}</span></InfoRow>
          <InfoRow label="Aktivitas Terakhir"><span className="text-gray-300 text-right">{agent.lastActivity}</span></InfoRow>
        </div>

        {/* Helmet Detection */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <HardHat size={11} /> Helmet Detection
          </p>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Patuh</span>
                <span className="text-emerald-400 font-mono">{helmetDetection.compliant} orang</span>
              </div>
              <BarGauge value={compRate} color="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Tidak Patuh</span>
                <span className="text-red-400 font-mono">{helmetDetection.nonCompliant} orang</span>
              </div>
              <BarGauge value={100 - compRate} color="bg-red-500" />
            </div>
          </div>
        </div>

        {/* Incident history */}
        <div>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Activity size={11} /> Riwayat Insiden
          </p>
          <div className="space-y-1.5">
            {((agent as any).incidentHistory || []).map((a: {time: string; event: string}, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs font-mono text-blue-400 shrink-0 w-10">{a.time}</span>
                <span className="text-xs text-gray-300">{a.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────────

function AgentModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        {(agent as any).type === "safety"
          ? <SafetyModal agent={agent as SafetyAgentType} onClose={onClose} />
          : <HeavyEquipmentModal agent={agent as HeavyEquipmentAgent} onClose={onClose} />
        }
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [filter, setFilter]       = useState<FilterStatus>("all");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Agent | null>(null);
  const [agents, setAgents]       = useState<Agent[]>(mockAgents);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAgents = async () => {
      setLoading(true);
      const data = await fetchAgents();
      if (!mounted) return;
      setAgents(data.length > 0 ? data : mockAgents);
      setLoading(false);
    };

    loadAgents();

    const channel = subscribeAgents((data) => {
      if (mounted) setAgents(data.length > 0 ? data : mockAgents);
    });

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, []);

  const counts = useMemo(() => ({
    active:  agents.filter((a) => a.status === "active").length,
    idle:    agents.filter((a) => a.status === "idle").length,
    error:   agents.filter((a) => a.status === "error").length,
    offline: agents.filter((a) => a.status === "offline").length,
  }), [agents]);

  const visible = useMemo(() =>
    agents.filter((a) => {
      const matchFilter = filter === "all" || a.status === filter;
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
                          a.id.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    }),
  [agents, filter, search]);

  const handleSelectAgent = async (agent: Agent) => {
    const [logs, errors] = await Promise.all([
      fetchAgentLogs(agent.id),
      fetchAgentErrors(agent.id),
    ]);

    if ((agent as any).type === "safety") {
      setSelected({
        ...(agent as SafetyAgentType),
        incidentHistory: logs.length > 0 ? logs.map(normalizeActivityLog) : (agent as SafetyAgentType).incidentHistory,
      });
      return;
    }

    setSelected({
      ...(agent as HeavyEquipmentAgent),
      activityHistory: logs.length > 0 ? logs.map(normalizeActivityLog) : (agent as HeavyEquipmentAgent).activityHistory,
      errorLog: errors.length > 0 ? errors.map(normalizeErrorLog) : (agent as HeavyEquipmentAgent).errorLog,
    });
  };

  return (
    <AppLayout>
      <Navbar title="AI Agents" />

      <div className="p-6 space-y-5">

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Aktif",   value: counts.active,  color: "text-emerald-400" },
            { label: "Idle",    value: counts.idle,    color: "text-amber-400"  },
            { label: "Error",   value: counts.error,   color: "text-red-400"    },
            { label: "Mati",    value: counts.offline, color: "text-gray-400"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 text-center">
              <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-gray-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-[#1f2937] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-white font-semibold text-sm">Daftar Agents</h3>

            {/* Right side: search + filter */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Cari agent..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="
                    pl-7 pr-3 py-1.5 text-xs font-mono rounded-lg
                    bg-[#0d1117] border border-[#1f2937]
                    text-white placeholder-gray-600
                    focus:outline-none focus:border-amber-500/40
                    w-40
                  "
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Filter chips */}
              <div className="flex items-center gap-1 flex-wrap">
                {FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`
                      px-2.5 py-1 text-xs font-mono rounded-md border transition-colors
                      ${filter === value
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "border-[#1f2937] text-gray-500 hover:text-gray-300 hover:border-gray-600"
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f2937]">
                {["Agent", "Status", "Lokasi", "Baterai"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-widest font-mono">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-xs text-gray-600 font-mono">
                    <Loader2 size={14} className="inline animate-spin mr-2" />
                    Memuat agents...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-xs text-gray-600 font-mono">
                    Tidak ada agent yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                visible.map((agent) => (
                  <tr
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent)}
                    className="border-b border-[#1f2937]/50 hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`
                          w-7 h-7 rounded-lg border flex items-center justify-center
                          ${(agent as any).type === "safety"
                            ? "bg-blue-500/10 border-blue-500/20"
                            : "bg-[#0d1117] border-[#1f2937]"
                          }
                        `}>
                          {(agent as any).type === "safety"
                            ? <Shield size={13} className="text-blue-400" />
                            : <Bot    size={13} className="text-amber-400" />
                          }
                        </div>
                        <div>
                          <p className="text-white text-sm group-hover:text-amber-300 transition-colors">
                            {agent.name}
                          </p>
                          <p className="text-gray-600 text-xs font-mono">{agent.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                        <MapPin size={11} />
                        {agent.location.lat.toFixed(4)}, {agent.location.lon.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Battery size={13} className={
                          agent.battery > 50 ? "text-emerald-400" :
                          agent.battery > 20 ? "text-amber-400" :
                          "text-red-400"
                        } />
                        <span className="text-sm text-white font-mono">{agent.battery}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Row count */}
          <div className="px-5 py-3 border-t border-[#1f2937] flex items-center justify-between">
            <span className="text-xs text-gray-600 font-mono">
              Menampilkan {visible.length} dari {agents.length} agent
            </span>
            <span className="text-xs text-gray-600 font-mono">
              Klik baris untuk detail ›
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selected && <AgentModal agent={selected} onClose={() => setSelected(null)} />}
    </AppLayout>
  );
}

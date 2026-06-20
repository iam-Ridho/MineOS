"use client";

import { useState, useEffect } from "react";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Database,
  Server,
  Bot,
  Zap,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Clock,
  Shield,
  Car,
  Leaf,
  Mountain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  fleet: <Car className="w-5 h-5" />,
  safety: <Shield className="w-5 h-5" />,
  emission: <Leaf className="w-5 h-5" />,
  reclamation: <Mountain className="w-5 h-5" />,
};

const AGENT_COLORS: Record<string, string> = {
  fleet: "bg-blue-50 text-blue-600 border-blue-200",
  safety: "bg-amber-50 text-amber-600 border-amber-200",
  emission: "bg-emerald-50 text-emerald-600 border-emerald-200",
  reclamation: "bg-purple-50 text-purple-600 border-purple-200",
};

export default function AgentMonitorPage() {
  const { agents, decisions, health, loading, error, lastUpdate, refresh } = useRealtimeData(3000);
  const [mounted, setMounted] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!mounted) {
    return (
      <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Calculate stats
  const activeAgents = agents.filter(a => a.status === "active" || a.status === "running").length;
  const avgConfidence = agents.length > 0 
    ? Math.round(agents.reduce((sum, a) => sum + (a.confidence || 0), 0) / agents.length * 100) 
    : 0;

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-slate-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans text-xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-1.5 h-7 bg-cyan-500 rounded-sm" />
              Agent Monitor
            </h1>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Total Agen</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono">{agents.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Aktif</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 font-mono">{activeAgents}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Rata-rata Kepercayaan</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 font-mono">{avgConfidence}%</p>
          </div>
          {/* <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Pembaruan Terakhir</span>
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : "—"}
            </p>
          </div> */}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && agents.length === 0 && (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mr-3" />
            Menghubungkan ke backend & Supabase...
          </div>
        )}

        {/* No Data */}
        {!loading && agents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <WifiOff className="w-12 h-12 mb-3 opacity-50" />
            <p>Tidak ada data agent dari backend atau Supabase</p>
            <p className="text-sm mt-1">Pastikan backend Ridho (10.10.14.40:8000) berjalan</p>
          </div>
        )}

        {/* Main Grid: 2x2 Agent Cards + Panel Pemantau */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grid Agen — 2x2 layout (kode 2) + header expand untuk Tugas Saat Ini */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {agents.map((agent) => {
                const statusConfig = {
                  running: { dot: "bg-emerald-500", label: "BERJALAN", animate: true },
                  active: { dot: "bg-emerald-500", label: "ACTIVE", animate: true },
                  processing: { dot: "bg-amber-500", label: "MEMPROSES", animate: true },
                  idle: { dot: "bg-slate-400", label: "SIAGA", animate: false },
                  error: { dot: "bg-red-500", label: "GALAT", animate: true },
                  offline: { dot: "bg-gray-500", label: "TERPUTUS", animate: false },
                }[agent.status] || { dot: "bg-slate-400", label: "SIAGA", animate: false };

                const domain = agent.domain || "general";
                const icon = AGENT_ICONS[domain] || <Bot className="w-5 h-5" />;
                const colorClass = AGENT_COLORS[domain] || "bg-slate-50 text-slate-600 border-slate-200";
                const isOpen = expandedAgents.has(agent.id);
                const conf = agent.confidence ? agent.confidence * 100 : 0;

                return (
                  <div
                    key={agent.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* ── Header Kartu (klik untuk expand Tugas Saat Ini) ── */}
                    <button
                      onClick={() => toggleExpand(agent.id)}
                      className="w-full text-left flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorClass}`}>
                          {icon}
                        </div>
                        <div>
                          <h3 className="font-sans text-sm font-bold text-slate-900 leading-tight">{agent.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${statusConfig.animate ? "animate-pulse" : ""}`} />
                            <span className="text-[9px] text-slate-500 font-mono uppercase">{statusConfig.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-mono">ID: {agent.id.slice(-6)}</span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                    </button>

                    {/* ── Tugas Saat Ini: Preview (selalu terlihat, sedikit) ── */}
                    {agent.currentTask && (
                      <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Tugas Saat Ini</span>
                        </div>
                        <p className={`text-[11px] text-slate-700 font-sans leading-relaxed ${isOpen ? "" : "line-clamp-2"}`}>
                          {agent.currentTask}
                        </p>
                      </div>
                    )}

                    {/* ── Expanded: Jika tidak ada currentTask, tampilkan info ── */}
                    {!agent.currentTask && isOpen && (
                      <div className="mb-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Zap className="w-3 h-3 text-slate-400" />
                          <span className="text-[9px] text-slate-500 font-mono uppercase font-bold">Tugas Saat Ini</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed italic">
                          Tidak ada task aktif
                        </p>
                      </div>
                    )}

                    {/* Grid Metrik (selalu terlihat) */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Tingkat Kepercayaan */}
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1 mb-1.5">
                          <BarChart3 className="w-3 h-3 text-blue-500" />
                          <span className="text-[8px] text-slate-500 font-mono uppercase font-bold">Tingkat Kepercayaan</span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-base font-bold text-slate-900 font-mono">
                            {agent.confidence ? (agent.confidence * 100).toFixed(1) : "0.0"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mb-0.5">%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all" 
                            style={{ width: `${agent.confidence ? agent.confidence * 100 : 0}%` }} 
                          />
                        </div>
                      </div>

                      {/* Efisiensi */}
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1 mb-1.5">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          <span className="text-[8px] text-slate-500 font-mono uppercase font-bold">Efisiensi</span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-base font-bold text-emerald-600 font-mono">+12</span>
                          <span className="text-[10px] text-slate-500 font-mono mb-0.5">%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: "65%" }} />
                        </div>
                      </div>
                    </div>

                    {/* Log Komunikasi (selalu terlihat) */}
                    <div className="mt-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessageSquare className="w-3 h-3 text-purple-500" />
                        <span className="text-[8px] text-slate-500 font-mono uppercase font-bold">Log Komunikasi</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[8px] text-slate-400 font-mono shrink-0">{lastUpdate ? lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--:--"}</span>
                          <p className="text-[10px] text-slate-600 font-sans leading-relaxed">
                            <span className="font-bold text-slate-800">[{agent.name.split(" ")[0]}]</span> Memproses data...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Pemantau — di kanan */}
          <div className="lg:col-span-1 space-y-4">
            {/* Pemantau Sistem */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-sans text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                Pemantau Sistem
              </h3>

              <div className="space-y-4">
                {/* Backend Status */}
                {/* <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Koneksi Backend</span>
                    <span className={`text-[10px] font-mono font-bold ${health.backend ? "text-emerald-600" : "text-red-600"}`}>
                      {health.backend ? "TERHUBUNG" : "TERPUTUS"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${health.backend ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: health.backend ? "100%" : "30%" }} />
                  </div>
                </div> */}

                {/* Supabase Status */}
                {/* <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Koneksi Supabase</span>
                    <span className={`text-[10px] font-mono font-bold ${health.supabase ? "text-emerald-600" : "text-red-600"}`}>
                      {health.supabase ? "TERHUBUNG" : "TERPUTUS"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${health.supabase ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: health.supabase ? "100%" : "30%" }} />
                  </div>
                </div> */}

                {/* Distribusi Agen */}
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block mb-2">Distribusi Agen</span>
                  <div className="space-y-1.5">
                    {agents.map((agent) => {
                      const domainColors: Record<string, string> = {
                        fleet: "bg-blue-500",
                        safety: "bg-amber-500",
                        emission: "bg-emerald-500",
                        reclamation: "bg-purple-500",
                      };
                      return (
                        <div key={agent.id} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${domainColors[agent.domain || "general"] || "bg-slate-400"}`} />
                          <span className="text-[10px] text-slate-700 font-sans flex-1 truncate">{agent.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{agent.status.toUpperCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Keputusan AI Terbaru */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-blue-600" />
                Keputusan AI Terbaru
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {decisions.slice(0, 10).map((d, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        d.priority_level === "critical" ? "bg-red-500" :
                        d.priority_level === "high" ? "bg-orange-500" :
                        d.priority_level === "medium" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      <span className="text-[9px] text-slate-500 font-mono uppercase">{d.priority_level}</span>
                      <span className="ml-auto text-[9px] text-slate-400 font-mono">{d.source || "unknown"}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-sans leading-relaxed line-clamp-2">{d.decision_text}</p>
                  </div>
                ))}
                {decisions.length === 0 && (
                  <p className="text-slate-400 text-center py-4 font-mono text-xs">Belum ada keputusan</p>
                )}
              </div>
            </div>

            {/* Statistik Cepat */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900 mb-3">
                Statistik Cepat
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-lg font-bold text-slate-900 font-mono">{agents.length}</p>
                  <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Agents</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-lg font-bold text-emerald-600 font-mono">{activeAgents}</p>
                  <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Aktif</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-lg font-bold text-blue-600 font-mono">{avgConfidence}%</p>
                  <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Tingkat Kepercayaan</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-lg font-bold text-amber-600 font-mono">{decisions.length}</p>
                  <p className="text-[9px] text-slate-500 font-mono uppercase mt-1">Decisions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
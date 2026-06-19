"use client";

import { motion } from "framer-motion";
import { Activity, Database, AlertTriangle, CheckCircle, Zap, Cpu, BarChart3, FileText, Bell } from "lucide-react";

interface LocalHealth {
  backend?: boolean;
  supabase?: boolean;
  status?: string;
  latency?: number;
}

interface Agent {
  id: string;
  name: string;
  domain: string;
  status: string;
  confidence: number;
  efficiency: number;
}

interface FooterMonitorBarProps {
  backendHealth: LocalHealth | null;
  aiDecisions: any[];
  agents: Agent[];
  lastUpdate: Date;
}

export default function FooterMonitorBar({ backendHealth, aiDecisions, agents, lastUpdate }: FooterMonitorBarProps) {
  const isBackendOnline = backendHealth?.status === "healthy" || backendHealth?.backend === true;
  const isSupabaseOnline = backendHealth?.supabase === true || backendHealth?.status === "healthy";

  const avgConfidence = agents.length > 0
    ? (agents.reduce((sum, a) => sum + a.confidence, 0) / agents.length).toFixed(0)
    : "0";

  const activeAgents = agents.filter(a => a.status === "AKTIF" || a.status === "RUNNING" || a.status === "PROCESSING").length;

  const getDecisionIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return <AlertTriangle className="w-3 h-3 text-red-400" />;
      case "warning": return <Zap className="w-3 h-3 text-amber-400" />;
      default: return <CheckCircle className="w-3 h-3 text-green-400" />;
    }
  };

  const getDecisionSeverity = (decision: any) => {
    const title = decision.title?.toLowerCase() || "";
    if (title.includes("critical") || title.includes("emergency")) return "critical";
    if (title.includes("warning") || title.includes("alert")) return "warning";
    return "normal";
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/50"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: System Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-800/50">
              <Cpu className="w-3 h-3 text-slate-500" />
              <span className={`w-2 h-2 rounded-full ${isBackendOnline ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-slate-400">Backend {isBackendOnline ? "ON" : "OFF"}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-800/50">
              <Database className="w-3 h-3 text-slate-500" />
              <span className={`w-2 h-2 rounded-full ${isSupabaseOnline ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs text-slate-400">Supabase {isSupabaseOnline ? "ON" : "OFF"}</span>
            </div>
          </div>

          {/* Center: AI Decisions */}
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <Activity className="w-3 h-3 text-amber-400 shrink-0" />
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {aiDecisions.length > 0 ? (
                aiDecisions.slice(0, 3).map((decision, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-900/80 rounded-lg px-2.5 py-1.5 border border-slate-800/50 shrink-0">
                    {getDecisionIcon(getDecisionSeverity(decision))}
                    <span className="text-xs text-slate-300 truncate max-w-[150px]">
                      {decision.title || "No title"}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-600">No recent decisions</span>
              )}
            </div>
          </div>

          {/* Right: Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-800/50">
              <span className="text-xs text-slate-500">Agents</span>
              <span className="text-xs font-bold text-white">{activeAgents}/{agents.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-800/50">
              <span className="text-xs text-slate-500">Avg Conf</span>
              <span className="text-xs font-bold text-green-400">{avgConfidence}%</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 rounded-lg px-3 py-1.5 border border-slate-800/50">
              <span className="text-xs text-slate-500">Updated</span>
              <span className="text-xs font-mono text-slate-400">
                {lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
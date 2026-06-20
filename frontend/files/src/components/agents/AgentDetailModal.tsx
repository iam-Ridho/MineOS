"use client";

import { motion } from "framer-motion";
import { X, Rocket, BarChart3, Truck, Shield, Leaf, Mountain } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  domain: string;
  status: string;
  confidence: number;
  efficiency: number;
  currentTask: string;
  log: string;
  color: string;
  metrics: {
    label: string;
    value: string;
  }[];
  logHistory: string[];
}

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
}

export default function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  const getConfidenceBar = (confidence: number) => {
    const filled = Math.round(confidence / 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  };

  const getEfficiencyDisplay = (efficiency: number) => {
    const sign = efficiency >= 0 ? "+" : "";
    const arrow = efficiency >= 0 ? "▲" : "▼";
    return `${sign}${efficiency}% ${arrow}`;
  };

  const getAgentIcon = (domain: string) => {
    switch (domain) {
      case "FLEET": return <Truck className="w-8 h-8" />;
      case "SAFETY": return <Shield className="w-8 h-8" />;
      case "EMISSION": return <Leaf className="w-8 h-8" />;
      case "RECLAMATION": return <Mountain className="w-8 h-8" />;
      default: return <Shield className="w-8 h-8" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Top gradient bar */}
        <div className={`h-1 bg-gradient-to-r ${agent.color}`} />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${agent.color} shadow-lg`}>
              {getAgentIcon(agent.domain)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-sm text-green-400 font-medium">{agent.status}</span>
                <span className="text-slate-500">•</span>
                <span className="text-sm text-slate-500">{agent.domain}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Confidence & Efficiency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-2">Confidence</div>
              <div className="text-2xl font-bold mb-1">{agent.confidence.toFixed(1)}%</div>
              <div className="text-sm font-mono text-slate-500">{getConfidenceBar(agent.confidence)}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-2">Efficiency</div>
              <div className={`text-2xl font-bold mb-1 ${agent.efficiency >= 0 ? "text-green-400" : "text-red-400"}`}>
                {getEfficiencyDisplay(agent.efficiency)}
              </div>
              <div className={`text-sm font-mono ${agent.efficiency >= 0 ? "text-green-500/50" : "text-red-500/50"}`}>
                {"█".repeat(Math.min(Math.abs(agent.efficiency), 10)) + "░".repeat(10 - Math.min(Math.abs(agent.efficiency), 10))}
              </div>
            </div>
          </div>

          {/* Current Task */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-amber-400">⚡ CURRENT TASK</span>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {agent.currentTask}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-3">📊 METRICS</div>
            <div className="grid grid-cols-4 gap-3">
              {agent.metrics.map((metric, i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 text-center">
                  <div className="text-xl font-bold text-white">{metric.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Log History */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-3">📻 LOG HISTORY</div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 space-y-2">
              {agent.logHistory.map((log, i) => (
                <div key={i} className="text-sm text-slate-400 font-mono flex items-start gap-2">
                  <span className="text-slate-600">{i + 1}.</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800/50 flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl transition-all">
            <Rocket className="w-4 h-4" />
            Take Action
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl transition-all border border-slate-700/50">
            <BarChart3 className="w-4 h-4" />
            View Reports
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
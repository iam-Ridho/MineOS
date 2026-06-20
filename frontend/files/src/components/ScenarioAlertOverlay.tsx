// components/ScenarioAlertOverlay.tsx
// Overlay di atas CesiumViewer — hanya:
//   - Toast notifikasi di kanan atas (auto-dismiss 8 detik)
//   - Banner di atas peta saat scenario storm/incident/fatigue
// AI Decision Panel dan Alert Log DIHAPUS — pindah ke sidebar kiri
"use client";

import React from "react";
import {
  AlertTriangle, X,
  Wind, ShieldAlert, Activity,
} from "lucide-react";
import type { Alert, AiDecision } from "@/hooks/useAlerts";

// ── CONSTANTS ──────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, {
  bg: string; border: string; text: string; badge: string; icon: React.ElementType;
}> = {
  CRITICAL: {
    bg:     "bg-red-950/95",
    border: "border-red-500",
    text:   "text-red-100",
    badge:  "bg-red-500 text-white",
    icon:   ShieldAlert,
  },
  WARNING: {
    bg:     "bg-amber-950/95",
    border: "border-amber-500",
    text:   "text-amber-100",
    badge:  "bg-amber-500 text-black",
    icon:   AlertTriangle,
  },
  INFO: {
    bg:     "bg-slate-900/95",
    border: "border-blue-500",
    text:   "text-blue-100",
    badge:  "bg-blue-500 text-white",
    icon:   Activity,
  },
};

const SCENARIO_BANNER: Record<string, { text: string; sub: string; bg: string; icon: React.ElementType } | null> = {
  storm:    { text: "STORM WARNING ACTIVE", sub: "Reduce speed — low visibility conditions", bg: "bg-blue-900/90 border-blue-400", icon: Wind },
  incident: { text: "INCIDENT DETECTED",    sub: "Emergency protocol initiated", bg: "bg-red-900/90 border-red-500", icon: ShieldAlert },
  fatigue:  { text: "FATIGUE ALERT",        sub: "Operator fatigue detected — reduced speed mode active", bg: "bg-amber-900/90 border-amber-400", icon: AlertTriangle },
  normal:   null,
};

// ── ALERT TOAST ──────────────────────────────────────────
function AlertToast({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const cfg = SEVERITY_CONFIG[alert.severity?.toUpperCase?.()] ?? SEVERITY_CONFIG.WARNING;
  const Icon = cfg.icon;

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm
        ${cfg.bg} ${cfg.border} ${cfg.text}
        shadow-2xl w-80 animate-in slide-in-from-right duration-300
      `}
    >
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}>
            {alert.severity}
          </span>
          <span className="text-[8px] font-mono text-current opacity-60">{alert.alert_type}</span>
          <span className="text-[8px] font-mono text-current opacity-40 ml-auto flex-shrink-0">{alert.zone}</span>
        </div>
        <p className="font-mono text-[10px] leading-relaxed line-clamp-3">{alert.message}</p>
        <p className="font-mono text-[8px] opacity-40 mt-1">
          {new Date(alert.created_at).toLocaleTimeString("id-ID")}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── SCENARIO BANNER ────────────────────────────────────────
function ScenarioBanner({ scenario }: { scenario: string }) {
  const cfg = SCENARIO_BANNER[scenario?.toLowerCase?.()];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div className={`
      absolute top-0 left-0 right-0 z-20
      flex items-center gap-3 px-4 py-2
      border-b ${cfg.bg} backdrop-blur-sm
    `}>
      <Icon size={14} className="text-current flex-shrink-0 animate-pulse" />
      <div className="flex-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">
          {cfg.text}
        </span>
        <span className="font-mono text-[9px] text-white/70 ml-3">{cfg.sub}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
        <span className="font-mono text-[8px] text-white/60 uppercase">{scenario}</span>
      </div>
    </div>
  );
}

// ── MAIN EXPORT ──────────────────────────────────────────
interface OverlayProps {
  toastQueue: Alert[];
  onDismissToast: (id: string) => void;
  latestDecision: AiDecision | null;
}

export function ScenarioAlertOverlay({
  toastQueue,
  onDismissToast,
  latestDecision,
}: OverlayProps) {
  const scenario = latestDecision?.scenario ?? "normal";

  return (
    <>
      {/* Scenario banner (top of map) */}
      <ScenarioBanner scenario={scenario} />

      {/* Toast notifications (top-right) */}
      {toastQueue.length > 0 && (
        <div className="absolute top-10 right-3 z-30 flex flex-col gap-2 pointer-events-auto">
          {toastQueue.slice(0, 3).map((alert) => (
            <AlertToast
              key={alert.id}
              alert={alert}
              onDismiss={() => onDismissToast(alert.id)}
            />
          ))}
          {toastQueue.length > 3 && (
            <div className="font-mono text-[8px] text-slate-400 text-center">
              +{toastQueue.length - 3} more alerts
            </div>
          )}
        </div>
      )}
    </>
  );
}
// hooks/useAlerts.ts
// Realtime subscription ke tabel alerts + ai_decisions
// alerts     → diinsert saat priority >= 3 (KRITIS / WARNING)
// ai_decisions → diinsert setiap agent cycle (~5 detik)
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO" | string;

export interface Alert {
  id: string;           // auto-generated untuk display (timestamp + type)
  alert_type: string;   // "FLEET" | "SAFETY" | "EMISSION" | "RECLAMATION"
  severity: AlertSeverity;
  message: string;
  zone: string;
  vehicle_id?: string;  // null kalau alert tidak terkait satu unit spesifik
  acknowledged?: boolean;
  created_at: string;
  db_id?: number;
}

export interface AiDecision {
  id?: number;
  decision_text: string;
  priority_level: string;  // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  scenario: string;        // "normal" | "storm" | "fatigue" | "incident"
  triggered_agents: string[];
  fleet_summary: string;
  safety_summary: string;
  emission_summary: string;
  reclamation_summary: string;
  llm_engine?: string;
  timestamp?: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/** Max alert yang disimpan di state (FIFO, yang terlama dihapus) */
const MAX_ALERTS = 20;

/** Durasi auto-dismiss notifikasi toast (ms). 0 = tidak auto-dismiss */
const TOAST_DURATION_MS = 8000;

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useAlerts() {
  const [alerts,      setAlerts]      = useState<Alert[]>([]);
  const [latestDecision, setLatestDecision] = useState<AiDecision | null>(null);
  const [toastQueue,  setToastQueue]  = useState<Alert[]>([]);  // untuk notif pop-up
  const [loading,     setLoading]     = useState(true);

  const alertChannelRef    = useRef<any>(null);
  const decisionChannelRef = useRef<any>(null);
  const reconnectRef       = useRef<any>(null);

  // ── Fetch initial alerts (10 terbaru) ──────────────────────────────────────
  const fetchInitial = useCallback(async () => {
    try {
      const [alertsRes, decisionRes] = await Promise.all([
        supabase
          .from("alerts")
          .select("id, alert_type, severity, message, zone, vehicle_id, acknowledged, created_at")
          .order("created_at", { ascending: false })
          .limit(MAX_ALERTS),
        supabase
          .from("ai_decisions")
          .select("id, decision_text, priority_level, scenario, triggered_agents, fleet_summary, safety_summary, emission_summary, reclamation_summary, llm_engine, timestamp")
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (alertsRes.data) {
        const mapped: Alert[] = alertsRes.data.map((row: any) => ({
          id: `${row.created_at}-${row.alert_type}-${row.id}`,
          db_id: row.id,
          alert_type: row.alert_type,
          severity: row.severity,
          message: row.message,
          zone: row.zone,
          vehicle_id: row.vehicle_id ?? undefined,
          acknowledged: row.acknowledged ?? false,
          created_at: row.created_at,
        }));
        setAlerts(mapped);
      }

      if (decisionRes.data) {
        setLatestDecision(decisionRes.data as AiDecision);
      }
    } catch (err) {
      console.warn("[alerts] fetchInitial error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Realtime: alerts INSERT ─────────────────────────────────────────────────
  const subscribeAlerts = useCallback(() => {
    alertChannelRef.current?.unsubscribe?.();

    alertChannelRef.current = supabase
      .channel(`alerts_rt_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload: any) => {
          const row = payload.new;
          const newAlert: Alert = {
            id: `${row.created_at}-${row.alert_type}-${row.id ?? Math.random()}`,
            db_id: row.id,
            alert_type: row.alert_type ?? "SYSTEM",
            severity: row.severity ?? "WARNING",
            message: row.message ?? "",
            zone: row.zone ?? "–",
            vehicle_id: row.vehicle_id ?? undefined,
            acknowledged: row.acknowledged ?? false,
            created_at: row.created_at ?? new Date().toISOString(),
          };

          // Tambah ke list (FIFO, potong jika melebihi MAX)
          setAlerts((prev) => [newAlert, ...prev].slice(0, MAX_ALERTS));

          // Tambah ke toast queue untuk pop-up notifikasi
          setToastQueue((prev) => [...prev, newAlert]);
        }
      )
      .subscribe((status: string) => {
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          if (!reconnectRef.current) {
            reconnectRef.current = setTimeout(() => {
              reconnectRef.current = null;
              subscribeAlerts();
              subscribeDecisions();
            }, 5000);
          }
        }
      });
  }, []);

  // ── Realtime: ai_decisions INSERT ──────────────────────────────────────────
  const subscribeDecisions = useCallback(() => {
    decisionChannelRef.current?.unsubscribe?.();

    decisionChannelRef.current = supabase
      .channel(`ai_decisions_rt_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_decisions" },
        (payload: any) => {
          setLatestDecision(payload.new as AiDecision);
        }
      )
      .subscribe();
  }, []);

  // ── Dismiss toast ───────────────────────────────────────────────────────────
  const dismissToast = useCallback((alertId: string) => {
    setToastQueue((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // ── Mount ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInitial();
    subscribeAlerts();
    subscribeDecisions();

    return () => {
      alertChannelRef.current?.unsubscribe?.();
      decisionChannelRef.current?.unsubscribe?.();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [fetchInitial, subscribeAlerts, subscribeDecisions]);

  // ── Auto-dismiss toast setelah TOAST_DURATION_MS ───────────────────────────
  useEffect(() => {
    if (toastQueue.length === 0) return;
    const oldest = toastQueue[0];
    const timer = setTimeout(() => {
      dismissToast(oldest.id);
    }, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toastQueue, dismissToast]);

  return {
    alerts,
    latestDecision,
    toastQueue,
    loading,
    dismissToast,
  };
}
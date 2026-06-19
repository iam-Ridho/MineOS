"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, type AIDecision, type SupabaseAlert } from "@/lib/supabase";
import {
  getAgentsStatus,
  getVehiclesLive,
  getEmissionsToday,
  type AgentStatusResponse,
  type VehicleLiveResponse,
  type EmissionData,
} from "@/lib/api/backend";

// ==================== TYPES ====================
export type LogType = "info" | "warning" | "error" | "decision";
export type ConnectionStatus = "connected" | "disconnected" | "error";

export interface AgentLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  type: LogType;
}

interface BackendDataState {
  agents: AgentStatusResponse[];
  vehicles: VehicleLiveResponse[];
  aiDecisions: AIDecision[];
  alerts: SupabaseAlert[];
  emissions: EmissionData | null;
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
}

interface BackendDataActions {
  refetch: () => Promise<void>;
  acknowledgeAlert: (alertId: number) => Promise<void>;
}

// ==================== CONFIGURATION ====================
const REFRESH_INTERVAL = 30000; // 30 detik
const RETRY_DELAY = 5000;       // 5 detik retry

// ==================== HOOK: useBackendData ====================
export function useBackendData(): [BackendDataState, BackendDataActions] {
  const [state, setState] = useState<BackendDataState>({
    agents: [],
    vehicles: [],
    aiDecisions: [],
    alerts: [],
    emissions: null,
    loading: true,
    error: null,
    connectionStatus: "disconnected",
    lastUpdate: null,
  });

  const retryCount = useRef(0);
  const maxRetries = 3;

  // ── Fetch Semua Data ──
  const fetchAllData = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Parallel fetching untuk performance
      const [
        agentsResult,
        vehiclesResult,
        emissionsResult,
        decisionsResult,
        alertsResult,
      ] = await Promise.allSettled([
        getAgentsStatus(),
        getVehiclesLive(),
        getEmissionsToday(),
        supabase
          .from("ai_decisions")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(20)
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          }),
        supabase
          .from("alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20)
          .then(({ data, error }) => {
            if (error) throw error;
            return data || [];
          }),
      ]);

      // Process results
      const agents = agentsResult.status === "fulfilled" ? agentsResult.value : [];
      const vehicles = vehiclesResult.status === "fulfilled" ? vehiclesResult.value : [];
      const emissions = emissionsResult.status === "fulfilled" ? emissionsResult.value : null;
      const aiDecisions = decisionsResult.status === "fulfilled" ? decisionsResult.value : [];
      const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];

      // Log errors tapi jangan fail seluruh fetch
      const errors = [
        agentsResult.status === "rejected" ? `Agents: ${agentsResult.reason}` : null,
        vehiclesResult.status === "rejected" ? `Vehicles: ${vehiclesResult.reason}` : null,
        emissionsResult.status === "rejected" ? `Emissions: ${emissionsResult.reason}` : null,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.warn("⚠️ Partial fetch errors:", errors);
      }

      setState({
        agents,
        vehicles,
        aiDecisions: aiDecisions as AIDecision[],
        alerts: alerts as SupabaseAlert[],
        emissions,
        loading: false,
        error: errors.length > 0 ? errors.join("; ") : null,
        connectionStatus: errors.length === 0 ? "connected" : errors.length < 3 ? "connected" : "error",
        lastUpdate: new Date(),
      });

      retryCount.current = 0; // Reset retry counter

    } catch (err) {
      console.error("❌ Critical fetch error:", err);

      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`🔄 Retrying... (${retryCount.current}/${maxRetries})`);
        setTimeout(() => fetchAllData(true), RETRY_DELAY * retryCount.current);
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
        connectionStatus: "error",
      }));
    }
  }, []);

  // ── Initial Fetch & Polling ──
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => fetchAllData(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ── Realtime Subscriptions ──
  useEffect(() => {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // AI Decisions realtime
    const aiChannel = supabase
      .channel("hook-ai-decisions")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ai_decisions",
      }, (payload: { new: Record<string, unknown> }) => {
        const newDecision = payload.new as unknown as AIDecision;
        setState(prev => ({
          ...prev,
          aiDecisions: [newDecision, ...prev.aiDecisions].slice(0, 20),
          lastUpdate: new Date(),
        }));
      })
      .subscribe();
    channels.push(aiChannel);

    // Alerts realtime
    const alertChannel = supabase
      .channel("hook-alerts")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "alerts",
      }, (payload: { new: Record<string, unknown> }) => {
        const newAlert = payload.new as unknown as SupabaseAlert;
        setState(prev => ({
          ...prev,
          alerts: [newAlert, ...prev.alerts].slice(0, 20),
          lastUpdate: new Date(),
        }));
      })
      .subscribe();
    channels.push(alertChannel);

    // Vehicle positions realtime
    const vehicleChannel = supabase
      .channel("hook-vehicles")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "vehicle_positions",
      }, (payload: { new: Record<string, unknown> }) => {
        const v = payload.new as {
          vehicle_id: string;
          operator_name: string | null;
          latitude: number | null;
          longitude: number | null;
          speed_kmh: number | null;
          fuel_pct: number | null;
          zone: string | null;
          load_weight_ton: number | null;
          heading_deg: number | null;
          timestamp: string;
        };
        setState(prev => {
          const filtered = prev.vehicles.filter(ve => ve.id !== v.vehicle_id);
          return {
            ...prev,
            vehicles: [{
              id: v.vehicle_id,
              name: v.operator_name || v.vehicle_id,
              lat: v.latitude || -1.9178,
              lon: v.longitude || 115.8697,
              speed: v.speed_kmh || 0,
              fuel: v.fuel_pct || 0,
              status: (v.speed_kmh || 0) > 0.5 ? "MOVING" : "IDLE",
              zone: v.zone || "Unknown",
              operator: v.operator_name || "Unassigned",
              load_weight: v.load_weight_ton || 0,
              heading: v.heading_deg || 0,
              timestamp: v.timestamp,
            }, ...filtered].slice(0, 20),
            lastUpdate: new Date(),
          };
        });
      })
      .subscribe();
    channels.push(vehicleChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  // ── Actions ──
  const refetch = useCallback(async () => {
    retryCount.current = 0;
    await fetchAllData();
  }, [fetchAllData]);

  const acknowledgeAlert = useCallback(async (alertId: number) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({
          acknowledged: true,
          acknowledged_by: "Operator",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(a =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_by: "Operator" }
            : a
        ),
      }));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  }, []);

  return [state, { refetch, acknowledgeAlert }];
}

// ==================== HOOK: useAgentMonitor ====================
export function useAgentMonitor() {
  const [state, setState] = useState<{
    agents: AgentStatusResponse[];
    logs: AgentLog[];
    aiDecisions: AIDecision[];
    loading: boolean;
    connectionStatus: ConnectionStatus;
  }>({
    agents: [],
    logs: [],
    aiDecisions: [],
    loading: true,
    connectionStatus: "disconnected",
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const agents = await getAgentsStatus();

        const { data: decisions } = await supabase
          .from("ai_decisions")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(50);

        // Parse logs dari decisions
        const logs: AgentLog[] = [];

        (decisions || []).forEach((d: Record<string, unknown>) => {
          const agents_list = (d.triggered_agents as string || "")
            .split(",")
            .map((a: string) => a.trim().toLowerCase())
            .filter(Boolean);

          agents_list.forEach((agentName: string) => {
            const logType: LogType = d.priority_level === "high" ? "error" : d.priority_level === "medium" ? "warning" : "decision";
            logs.push({
              id: `${d.id}-${agentName}`,
              timestamp: new Date(d.timestamp as string).toLocaleTimeString("id-ID"),
              agent: agentName,
              message: (d.decision_text as string) || (d.fleet_summary as string) || (d.safety_summary as string) || "Update",
              type: logType,
            });
          });
        });

        logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        if (mounted) {
          setState({
            agents,
            logs: logs.slice(0, 20),
            aiDecisions: (decisions || []) as AIDecision[],
            loading: false,
            connectionStatus: "connected",
          });
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            connectionStatus: "error",
          }));
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);

    // Realtime subscription
    const channel = supabase
      .channel("agent-monitor")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ai_decisions",
      }, (payload: { new: Record<string, unknown> }) => {
        const d = payload.new as unknown as AIDecision;
        const agents_list = (d.triggered_agents || "")
          .split(",")
          .map((a: string) => a.trim().toLowerCase())
          .filter(Boolean);

        setState(prev => {
          const newLogs: AgentLog[] = agents_list.map(agentName => {
            const logType: LogType = d.priority_level === "high" ? "error" : d.priority_level === "medium" ? "warning" : "decision";
            return {
              id: `${d.id}-${agentName}-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString("id-ID"),
              agent: agentName,
              message: d.decision_text || "Keputusan baru",
              type: logType,
            };
          });

          return {
            ...prev,
            aiDecisions: [d, ...prev.aiDecisions].slice(0, 50),
            logs: [...newLogs, ...prev.logs].slice(0, 20),
            connectionStatus: "connected",
          };
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

export default useBackendData;
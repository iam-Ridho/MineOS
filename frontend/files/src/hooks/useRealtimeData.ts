"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAgentsStatus,
  getAIDecisions,
  checkBackendHealth,
  subscribeToAIDecisions,
  type AgentStatus,
  type AIDecision,
} from "@/lib/api/backend";

// ─── Types untuk Agent Monitor ───────────────────────────────
export interface Agent {
  id: string;
  name: string;
  status: "running" | "active" | "processing" | "idle" | "error" | "offline";
  domain: "fleet" | "safety" | "emission" | "reclamation" | "general";
  confidence: number;
  currentTask?: string;
  lastSeen?: string;
}

export interface Decision {
  id: string;
  decision_text: string;
  priority_level: "critical" | "high" | "medium" | "low";
  source: string;
  timestamp: string;
}

export interface HealthStatus {
  backend: boolean;
  supabase: boolean;
}

// ─── Mapping dari backend type ke monitor type ───────────────
function mapAgentStatus(status: string): Agent["status"] {
  const valid: Agent["status"][] = ["running", "active", "processing", "idle", "error", "offline"];
  return valid.includes(status as Agent["status"]) ? (status as Agent["status"]) : "idle";
}

function mapDomain(domain?: string): Agent["domain"] {
  const valid: Agent["domain"][] = ["fleet", "safety", "emission", "reclamation"];
  return valid.includes(domain as Agent["domain"]) ? (domain as Agent["domain"]) : "general";
}

function mapPriority(priority?: string): Decision["priority_level"] {
  const valid: Decision["priority_level"][] = ["critical", "high", "medium", "low"];
  return valid.includes(priority as Decision["priority_level"]) 
    ? (priority as Decision["priority_level"]) 
    : "medium";
}

// ─── Hook: useRealtimeData ───────────────────────────────────
export function useRealtimeData(pollInterval = 5000) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [health, setHealth] = useState<HealthStatus>({ backend: false, supabase: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const isMounted = useRef(true);

  // ── Fetch semua data ──
  const fetchData = useCallback(async (isInitial = false) => {
    if (!isMounted.current) return;

    if (isInitial) setLoading(true);
    setError(null);

    try {
      console.log("[useRealtimeData] 🔄 Fetching data...");

      // Fetch agents (dari backend Ridho)
      const agentsData = await getAgentsStatus();

      // Fetch decisions (dari Supabase)
      const decisionsData = await getAIDecisions();

      // Health check
      const healthData = await checkBackendHealth();

      if (!isMounted.current) return;

      // Map agents
      const mappedAgents: Agent[] = agentsData.map((a: AgentStatus) => ({
        id: a.id,
        name: a.name,
        status: mapAgentStatus(a.status),
        domain: mapDomain(a.domain),
        confidence: typeof a.confidence === "number" ? a.confidence : 0.85,
        currentTask: a.currentTask || undefined,
        lastSeen: a.lastSeen || undefined,
      }));

      // Map decisions
      const mappedDecisions: Decision[] = decisionsData.map((d: AIDecision) => ({
        id: d.id || `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        decision_text: d.decision_text || "No decision text",
        priority_level: mapPriority(d.priority_level),
        source: d.source || "supabase",
        timestamp: d.timestamp || new Date().toISOString(),
      }));

      setAgents(mappedAgents);
      setDecisions(mappedDecisions);
      setHealth(healthData);
      setLastUpdate(new Date());

      console.log("[useRealtimeData] ✅ Data updated:", {
        agents: mappedAgents.length,
        decisions: mappedDecisions.length,
        health: healthData,
      });

      // Error handling
      if (!healthData.backend && !healthData.supabase) {
        setError("Backend & Supabase tidak dapat dijangkau");
      } else if (!healthData.backend) {
        setError("Backend Ridho offline — menampilkan data terakhir");
      } else if (!healthData.supabase) {
        setError("Supabase offline — decisions tidak diupdate");
      }

    } catch (err) {
      console.error("[useRealtimeData] 💥 Error:", err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (isMounted.current && isInitial) {
        setLoading(false);
      }
    }
  }, []);

  // ── Setup: initial fetch + polling + realtime ──
  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    fetchData(true);

    // Polling interval
    intervalRef.current = setInterval(() => {
      fetchData(false);
    }, pollInterval);

    // Supabase realtime subscription untuk decisions
    try {
      unsubRef.current = subscribeToAIDecisions((newDecision) => {
        console.log("[useRealtimeData] 🔔 Realtime decision received:", newDecision);
        if (isMounted.current) {
          setDecisions(prev => [{
            id: newDecision.id || `dec-${Date.now()}`,
            decision_text: newDecision.decision_text,
            priority_level: mapPriority(newDecision.priority_level),
            source: newDecision.source || "supabase",
            timestamp: newDecision.timestamp || new Date().toISOString(),
          }, ...prev].slice(0, 50)); // keep last 50
          setLastUpdate(new Date());
        }
      });
    } catch (e) {
      console.warn("[useRealtimeData] Realtime subscription failed:", e);
    }

    // Cleanup
    return () => {
      isMounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, [fetchData, pollInterval]);

  // ── Manual refresh ──
  const refresh = useCallback(() => {
    console.log("[useRealtimeData] 🔄 Manual refresh triggered");
    fetchData(true);
  }, [fetchData]);

  return {
    agents,
    decisions,
    health,
    loading,
    error,
    lastUpdate,
    refresh,
  };
}
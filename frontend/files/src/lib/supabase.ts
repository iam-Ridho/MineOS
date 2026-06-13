import { createClient } from "@supabase/supabase-js";
import { FleetAgent } from "@/types/fleet";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ==================== TYPES (Sesuai Schema Database) ====================

export interface AIDecision {
  id: number;              // int8 → convert ke string di Dashboard
  decision_text: string;
  priority_level: string;
  triggered_agents: string;
  fleet_summary: string;
  safety_summary: string;
  emission_summary: string;
  reclamation_summary: string;
  scenario: string;
  llm_engine: string;
  timestamp: string;
}

export interface SupabaseAlert {
  id: number;              // int8 → convert ke string di Dashboard
  alert_type: string;
  severity: string;
  message: string;
  vehicle_id: string;
  zone: string;
  acknowledged: boolean;
  acknowledged_by: string;
  acknowledged_at: string;
  created_at: string;
}

// ==================== PARSER ====================
function parseFleetAgent(raw: any, master?: any): FleetAgent {
  return {
    id: String(raw?.vehicle_id || raw?.id || "UNKNOWN"),
    name: String(master?.name || raw?.vehicle_id || "UNKNOWN"),
    status: Number(raw?.speed_kmh || 0) > 0.5 ? "active" : "idle",
    type: String(master?.type || "Unknown"),
    fuel: Number(raw?.fuel_pct || 0),
    location: {
      lat: Number(raw?.latitude || 0),
      lon: Number(raw?.longitude || 0),
    },
    speed: Number(raw?.speed_kmh || 0),
    heading: Number(raw?.heading_deg || 0),
    operator: String(raw?.operator_name || "Unknown"),
    zone: String(raw?.zone || "Unknown"),
    capacity: Number(master?.capacity_ton || 0),
    load_weight: Number(raw?.load_weight_ton || 0),
    timestamp: raw?.timestamp || new Date().toISOString(),
  };
}

// ==================== FLEET FUNCTIONS (Digital Twin) ====================

export async function fetchFleetAgents(): Promise<FleetAgent[]> {
  console.log("📡 Calling RPC: get_latest_fleet()");

  const { data, error } = await supabase.rpc("get_latest_fleet");

  if (error) {
    console.error("❌ RPC error:", error);
    throw error;
  }

  const agents: FleetAgent[] = (data || []).map((row: any) => parseFleetAgent(row, row));
  console.log("📦 Fleet agents loaded:", agents.length, "vehicles");
  console.log("📦 Vehicle IDs:", agents.map((a: FleetAgent) => a.id));

  return agents;
}

export function subscribeToFleetAgents(
  onUpdate: (agent: FleetAgent) => void,
  onStatusChange?: (status: string) => void
) {
  console.log("📡 Subscribing to fleet realtime...");

  const channel = supabase
    .channel("fleet-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "vehicle_positions",
      },
      async (payload: any) => {
        console.log("🆕 Fleet position realtime:", payload.new);

        const vid = String(payload.new?.vehicle_id);

        let master = null;
        try {
          const { data } = await supabase
            .from("vehicles")
            .select("*")
            .eq("id", vid)
            .maybeSingle();
          master = data;
        } catch (e) {
          console.warn("⚠️ Master fetch failed for", vid);
        }

        const agent = parseFleetAgent(payload.new, master);
        console.log("🎯 Parsed fleet agent:", agent.id, agent.name, agent.location);

        onUpdate(agent);
      }
    )
    .subscribe((status: string) => {
      console.log("📡 Fleet agents status:", status);
      onStatusChange?.(status);
    });

  return channel;
}

// ==================== DASHBOARD FUNCTIONS ====================

export async function fetchAIDecisions(): Promise<AIDecision[]> {
  const { data, error } = await supabase
    .from("ai_decisions")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (error) {
    console.error("❌ Error fetch AI decisions:", error);
    return [];
  }

  return (data || []) as AIDecision[];
}

export async function fetchAlerts(): Promise<SupabaseAlert[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("❌ Error fetch alerts:", error);
    return [];
  }

  return (data || []) as SupabaseAlert[];
}

export function subscribeToAIDecisions(
  onUpdate: (decision: AIDecision) => void,
  onError?: (err: Error) => void
) {
  return supabase
    .channel("ai-decisions")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ai_decisions" },
      (payload: any) => {
        onUpdate(payload.new as AIDecision);
      }
    )
    .subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" && onError) {
        onError(new Error("AI decisions channel error"));
      }
    });
}

export function subscribeToAlerts(
  onUpdate: (alert: SupabaseAlert) => void,
  onError?: (err: Error) => void
) {
  return supabase
    .channel("alerts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "alerts" },
      (payload: any) => {
        onUpdate(payload.new as SupabaseAlert);
      }
    )
    .subscribe((status: string) => {
      if (status === "CHANNEL_ERROR" && onError) {
        onError(new Error("Alerts channel error"));
      }
    });
}

// ==================== LEGACY FUNCTIONS ====================

export async function getVehiclePositions() {
  const { data, error } = await supabase
    .from("vehicle_positions")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

export function subscribeToVehiclePositions(callback: (payload: any) => void) {
  return supabase
    .channel("vehicle-positions")
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_positions" }, callback)
    .subscribe();
}
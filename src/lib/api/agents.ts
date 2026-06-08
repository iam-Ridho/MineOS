import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { ActivityLog, Agent, AgentStatus, ErrorLog, HeavyEquipmentAgent } from "@/lib/api/mock-data";

type VehiclePositionRow = {
  id: number;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading_deg: number;
  fuel_pct: number;
  load_weight_ton: number;
  zone: string;
  operator_name: string;
  timestamp: string;
};

type AlertRow = {
  id: number;
  alert_type: string;
  severity: string;
  message: string;
  vehicle_id: string | null;
  zone: string | null;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAgentStatus(row: VehiclePositionRow): AgentStatus {
  if (row.fuel_pct < 20) return "error";
  if (row.speed_kmh <= 1) return "idle";
  return "active";
}

function vehiclePositionToAgent(row: VehiclePositionRow): HeavyEquipmentAgent {
  const fuel = Math.max(0, Math.min(100, Math.round(row.fuel_pct)));

  return {
    id: row.vehicle_id,
    name: row.vehicle_id,
    type: "heavy_equipment",
    status: getAgentStatus(row),
    location: { lat: row.latitude, lon: row.longitude },
    battery: fuel,
    vehicleModel: "Haul Truck",
    vehicleType: "Mining Haul Truck",
    engineTemp: 78,
    fuel,
    lastActivity: `${row.speed_kmh.toFixed(1)} km/h di ${row.zone}`,
    sensorStatus: row.fuel_pct < 20 ? "warning" : "normal",
    connection: "connected",
    lastOnline: formatDateTime(row.timestamp),
    activityHistory: [
      {
        time: formatTime(row.timestamp),
        event: `${row.vehicle_id} berada di ${row.zone} dengan muatan ${row.load_weight_ton.toFixed(1)} ton. Operator: ${row.operator_name}.`,
      },
    ],
    errorLog: [],
  };
}

function alertToErrorLog(row: AlertRow): ErrorLog {
  return {
    time: formatTime(row.created_at),
    code: row.severity || row.alert_type || "ALERT",
    message: row.message,
  };
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from("vehicle_positions")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(200);

    if (error) throw error;

    const latestByVehicle = new Map<string, VehiclePositionRow>();
    for (const row of (data ?? []) as VehiclePositionRow[]) {
      if (!latestByVehicle.has(row.vehicle_id)) latestByVehicle.set(row.vehicle_id, row);
    }

    return Array.from(latestByVehicle.values())
      .map(vehiclePositionToAgent)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }
}

export async function fetchAgentLogs(agentId: string): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from("vehicle_positions")
      .select("*")
      .eq("vehicle_id", agentId)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (error) throw error;

    return ((data ?? []) as VehiclePositionRow[]).map((row) => ({
      time: formatTime(row.timestamp),
      event: `${row.zone} · ${row.speed_kmh.toFixed(1)} km/h · fuel ${row.fuel_pct.toFixed(1)}% · load ${row.load_weight_ton.toFixed(1)} ton`,
    }));
  } catch (error) {
    console.error("Failed to fetch agent logs:", error);
    return [];
  }
}

export async function fetchAgentErrors(agentId: string): Promise<ErrorLog[]> {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("vehicle_id", agentId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return ((data ?? []) as AlertRow[]).map(alertToErrorLog);
  } catch (error) {
    console.error("Failed to fetch agent errors:", error);
    return [];
  }
}

export function subscribeAgents(callback: (agents: Agent[]) => void): RealtimeChannel {
  const refresh = async () => {
    const agents = await fetchAgents();
    callback(agents);
  };

  return supabase
    .channel("vehicle-positions-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_positions" }, refresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, refresh)
    .subscribe();
}

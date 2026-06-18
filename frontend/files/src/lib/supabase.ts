// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============ REALTIME SUBSCRIPTIONS (idempotent) ============
// Mencegah error "cannot add postgres_changes callbacks after subscribe()"
// dengan reuse channel yang sudah ada (by name) jika sudah subscribed.

function getOrCreateChannel(
  channelName: string,
  table: string,
  callback: (payload: any) => void
) {
  // Cek apakah channel dengan nama ini sudah ada & sudah subscribed
  const existing = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`);

  if (existing && existing.state === "joined") {
    console.warn(`[supabase] Channel "${channelName}" sudah subscribed, reuse existing.`);
    return existing;
  }

  // Kalau ada tapi belum joined (misal masih "closed"), remove dulu agar bersih
  if (existing) {
    supabase.removeChannel(existing);
  }

  return supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table },
      callback
    );
}

export function createFleetAgentsChannel(callback: (payload: any) => void) {
  return getOrCreateChannel("vehicle_positions_realtime", "vehicle_positions", callback);
}

export function createAlertsChannel(callback: (payload: any) => void) {
  return getOrCreateChannel("alerts", "alerts", callback);
}

export function createAIDecisionsChannel(callback: (payload: any) => void) {
  return getOrCreateChannel("ai-decisions", "ai_decisions", callback);
}

export function createOperatorFatigueChannel(callback: (payload: any) => void) {
  return getOrCreateChannel("operator-fatigue", "operator_fatigue", callback);
}

export function createEnvironmentSensorsChannel(callback: (payload: any) => void) {
  return getOrCreateChannel("environment-sensors", "environment_sensors", callback);
}

// ============ BACKWARD COMPATIBLE: subscribe functions ============

export function subscribeToFleetAgents(callback: (payload: any) => void, onError?: (err: any) => void) {
  const ch = createFleetAgentsChannel(callback);
  if (ch.state === "joined") return ch;
  return ch.subscribe((status: string, err?: Error) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) onError(err ?? status);
  });
}

export function subscribeToAlerts(callback: (payload: any) => void, onError?: (err: any) => void) {
  const ch = createAlertsChannel(callback);
  if (ch.state === "joined") return ch;
  return ch.subscribe((status: string, err?: Error) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) onError(err ?? status);
  });
}

export function subscribeToAIDecisions(callback: (payload: any) => void, onError?: (err: any) => void) {
  const ch = createAIDecisionsChannel(callback);
  if (ch.state === "joined") return ch;
  return ch.subscribe((status: string, err?: Error) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) onError(err ?? status);
  });
}

export function subscribeToOperatorFatigue(callback: (payload: any) => void, onError?: (err: any) => void) {
  const ch = createOperatorFatigueChannel(callback);
  if (ch.state === "joined") return ch;
  return ch.subscribe((status: string, err?: Error) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) onError(err ?? status);
  });
}

export function subscribeToEnvironmentSensors(callback: (payload: any) => void, onError?: (err: any) => void) {
  const ch = createEnvironmentSensorsChannel(callback);
  if (ch.state === "joined") return ch;
  return ch.subscribe((status: string, err?: Error) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && onError) onError(err ?? status);
  });
}

// ============ REST API ============
// (bagian getVehiclePositions, getAlerts, dll — tidak berubah)

export async function getVehiclePositions() {
  const { data, error } = await supabase
    .from("vehicle_positions")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function getAlerts() {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

export async function getAIDecisions() {
  const { data, error } = await supabase
    .from("ai_decisions")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getOperatorFatigue() {
  const { data, error } = await supabase
    .from("operator_fatigue")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

export async function getEnvironmentSensors() {
  const { data, error } = await supabase
    .from("environment_sensors")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function getReclamationZones() {
  const { data, error } = await supabase
    .from("reclamation_zones")
    .select("*")
    .order("last_updated", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function getProductionSnapshots() {
  const { data, error } = await supabase
    .from("production_snapshots")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return data;
}

// ============ ALIASES FOR BACKWARD COMPATIBILITY ============

export const fetchVehiclePositions = getVehiclePositions;
export const fetchAlerts = getAlerts;
export const fetchAIDecisions = getAIDecisions;
export const fetchOperatorFatigue = getOperatorFatigue;
export const fetchEnvironmentSensors = getEnvironmentSensors;
export const fetchReclamationZones = getReclamationZones;
export const fetchProductionSnapshots = getProductionSnapshots;

// ============ TYPES ============

export interface VehiclePosition {
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
}

export interface Alert {
  alert_id: string;
  alert_type: string;
  severity: string;
  message: string;
  vehicle_id: string;
  zone: string;
  created_at: string;
}

export interface AIDecision {
  id: number;
  decision_id: string;
  decision_text: string;
  fleet_summary?: string;
  priority_level: string;
  triggered_agents: string[];
  scenario: string;
  llm_engine: string;
  timestamp: string;
}

export interface SupabaseAlert {
  id: number;
  alert_id: string;
  alert_type: string;
  severity: string;
  message: string;
  vehicle_id: string;
  zone: string;
  created_at: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
}
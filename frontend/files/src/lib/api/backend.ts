// src/lib/api/backend.ts
// Backend Ridho + Supabase — FIXED v9: AGGRESSIVE logging for ANY format

import { supabase } from "@/lib/supabaseClient";

// ─── API Base ────────────────────────────────────────────────
const BACKEND_DIRECT = process.env.NEXT_PUBLIC_BACKEND_URL || "https://mine-os-3slq.vercel.app";
// Keep API_BASE empty to avoid double '/api' when endpoints already include '/api'
const API_BASE = "";

// ─── Config ──────────────────────────────────────────────────
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

// ─── Types ───────────────────────────────────────────────────

export interface AgentStatus {
  id: string;
  name: string;
  status: "active" | "idle" | "error" | "offline" | "running" | "processing";
  currentTask?: string;
  confidence?: number;
  metrics?: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
  domain?: string;
  lastSeen?: string;
}

export type AgentStatusResponse = AgentStatus;

export interface VehicleLiveResponse {
  id: string;
  vehicleId?: string;
  name: string;
  lat: number;
  lng?: number;
  lon: number;
  speed: number;
  status: string;
  fuel: number;
  fuel_level?: number;
  zone: string;
  operator: string;
  load_weight: number;
  heading: number;
  timestamp: string;
}

export type VehiclePosition = VehicleLiveResponse;

export interface EmissionData {
  co2: number;
  nox: number;
  pm25: number;
  fuelEfficiency: number;
  timestamp: string;
  fleet_total_24h?: number;
  total_vehicles?: number;
  avg_emission?: number;
}

export interface AIDecision {
  id: string;
  decision_text: string;
  triggered_agents: string[];
  priority_level: "low" | "medium" | "high" | "critical";
  timestamp: string;
  source?: "backend" | "supabase";
}

export const AGENT_STATUS_CONFIG = {
  running: { dot: "bg-emerald-500", label: "RUNNING", animate: true },
  active: { dot: "bg-emerald-500", label: "ACTIVE", animate: true },
  processing: { dot: "bg-amber-500", label: "PROCESSING", animate: true },
  idle: { dot: "bg-slate-400", label: "IDLE", animate: false },
  error: { dot: "bg-red-500", label: "ERROR", animate: true },
  offline: { dot: "bg-gray-500", label: "OFFLINE", animate: false },
} as const;

export type AgentStatusKey = keyof typeof AGENT_STATUS_CONFIG;

// ─── Helper: Fetch with timeout ──────────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[backend.ts] ⏱️ Timeout after ${timeoutMs}ms: ${url}`);
    controller.abort();
  }, timeoutMs);

  // Tambahkan header ngrok agar tidak terhadang halaman peringatan free account
  const headers = {
    ...options.headers,
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "custom-agent-mine-os"
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers, // <-- Masukkan header yang baru di sini
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── Helper: Fetch dengan retry + fallback ───────────────────
async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  const urls = [
    `${API_BASE}${endpoint}`,
    `${BACKEND_DIRECT}${endpoint}`,
  ];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    for (const url of urls) {
      try {
        console.log(`[backend.ts] 🌐 Fetching: ${url} (attempt ${attempt + 1}/${MAX_RETRIES})`);
        const response = await fetchWithTimeout(url, options, TIMEOUT_MS);

        if (!response.ok) {
          console.warn(`[backend.ts] ⚠️ HTTP ${response.status}: ${url}`);
          continue;
        }

        const data = await response.json();
        console.log(`[backend.ts] ✅ Success: ${url}`);
        return data;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[backend.ts] ❌ Failed: ${url} — ${errMsg}`);

        if (error instanceof Error && error.name !== "AbortError") {
          continue;
        }
      }
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  console.error(`[backend.ts] 💥 All attempts failed for: ${endpoint}`);
  return null;
}

// ─── Helper: Extract array dari berbagai format response ─────
function extractArray(data: unknown, possibleKeys: string[]): unknown[] | null {
  if (!data || typeof data !== "object") return null;

  if (Array.isArray(data)) {
    console.log(`[backend.ts] 📦 Response is direct array, length:`, data.length);
    return data;
  }

  const obj = data as Record<string, unknown>;

  for (const key of possibleKeys) {
    if (obj[key] && Array.isArray(obj[key])) {
      console.log(`[backend.ts] 📦 Response has key "${key}", length:`, (obj[key] as unknown[]).length);
      return obj[key] as unknown[];
    }
  }

  console.log(`[backend.ts] 📦 Response keys:`, Object.keys(obj));
  console.log(`[backend.ts] 📦 Response sample:`, JSON.stringify(obj).substring(0, 500));

  return null;
}

// ─── Helper: Extract number dari nested object ────────────────
function extractNumber(obj: unknown, ...keys: string[]): number {
  if (!obj || typeof obj !== "object") return 0;
  for (const key of keys) {
    const parts = key.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === "number") return current;
    if (typeof current === "string") {
      const parsed = parseFloat(current);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

// ─── Helper: Extract string dari nested object ───────────────
function extractString(obj: unknown, ...keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const parts = key.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === "string") return current;
  }
  return undefined;
}

// ─── Helper: Deep scan object untuk cari angka ──────────────
function deepScanForNumber(obj: unknown, ...fieldNames: string[]): number {
  if (!obj || typeof obj !== "object") return 0;

  const scan = (current: unknown, depth: number): number => {
    if (depth > 5) return 0;
    if (!current || typeof current !== "object") return 0;

    const record = current as Record<string, unknown>;

    for (const name of fieldNames) {
      if (name in record) {
        const val = record[name];
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = parseFloat(val);
          if (!isNaN(parsed)) return parsed;
        }
      }
    }

    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val === "number") {
        const lowerKey = key.toLowerCase();
        for (const name of fieldNames) {
          if (lowerKey.includes(name.toLowerCase())) return val;
        }
      }
      if (typeof val === "object" && val !== null) {
        const result = scan(val, depth + 1);
        if (result !== 0) return result;
      }
    }

    return 0;
  };

  return scan(obj, 0);
}

// ─── Helper: Deep scan untuk cari string/timestamp ────────────
function deepScanForString(obj: unknown, ...fieldNames: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  const scan = (current: unknown, depth: number): string | undefined => {
    if (depth > 5) return undefined;
    if (!current || typeof current !== "object") return undefined;

    const record = current as Record<string, unknown>;

    for (const name of fieldNames) {
      if (name in record) {
        const val = record[name];
        if (typeof val === "string") return val;
      }
    }

    for (const key of Object.keys(record)) {
      const val = record[key];
      if (typeof val === "string") {
        const lowerKey = key.toLowerCase();
        for (const name of fieldNames) {
          if (lowerKey.includes(name.toLowerCase())) return val;
        }
      }
      if (typeof val === "object" && val !== null) {
        const result = scan(val, depth + 1);
        if (result) return result;
      }
    }

    return undefined;
  };

  return scan(obj, 0);
}

// ─── Parse Priority Level dari Decision Text ─────────────────
function parsePriorityLevel(decisionText: string): "low" | "medium" | "high" | "critical" {
  if (decisionText.includes("[KRITIS]") || decisionText.includes("KRITIS")) return "critical";
  if (decisionText.includes("[WASPADA]") || decisionText.includes("WASPADA")) return "high";
  if (decisionText.includes("[NORMAL]") || decisionText.includes("NORMAL")) return "low";
  return "medium";
}

function parseConfidence(decisionText: string): number {
  const match = decisionText.match(/(\d+(?:\.\d+)?)%/);
  if (match) return parseFloat(match[1]) / 100;
  return 0.85;
}

function mapStatusFromPriority(priority: string): AgentStatus["status"] {
  if (priority === "critical") return "error";
  if (priority === "high") return "processing";
  if (priority === "medium") return "active";
  return "active";
}

// ─── Fetch Agents dari Backend Ridho ────────────────────────
export async function getAgentsStatus(): Promise<AgentStatus[]> {
  console.log("🔍 [getAgentsStatus] Fetching agents...");

  const response = await fetchWithRetry<Record<string, unknown>>("/api/agents/status");

  if (!response) {
    console.warn("❌ [getAgentsStatus] No response from backend");
    return [];
  }

  console.log("[getAgentsStatus] 📦 Raw response keys:", Object.keys(response));

  const agents = extractArray(response, ["agents", "data", "results", "items"]);

  if (!agents) {
    console.warn("❌ [getAgentsStatus] No agents array found in response");
    console.log("[getAgentsStatus] 📦 Full response:", JSON.stringify(response).substring(0, 1000));
    return [];
  }

  console.log("✅ [getAgentsStatus] Agents fetched:", agents.length);

  const lastDecision = response.last_decision as Record<string, unknown> | undefined 
    || response.decision as Record<string, unknown> | undefined 
    || response.latest_decision as Record<string, unknown> | undefined;

  const priorityLevel = (lastDecision?.priority_level as string) || "";
  const decisionText = (lastDecision?.decision_text as string) || "";
  const timestamp = (lastDecision?.timestamp as string) || new Date().toISOString();

  return agents.map((agent: unknown) => {
    const a = agent as Record<string, unknown>;
    const status = mapStatusFromPriority(priorityLevel);
    const confidence = parseConfidence(decisionText);

    return {
      id: (a.id as string) || `agent-${(a.name as string)?.toLowerCase().replace(/\s+/g, "-") || "unknown"}`,
      name: (a.name as string) || (a.agent_name as string) || "Unknown Agent",
      status: (a.status as AgentStatus["status"]) || status,
      currentTask: (a.current_task as string) || (a.currentTask as string) || decisionText,
      confidence: typeof a.confidence === "number" ? a.confidence : confidence,
      domain: (a.domain as string) || (a.type as string) || (a.category as string) || "general",
      lastSeen: (a.last_seen as string) || (a.updated_at as string) || timestamp,
    };
  });
}

export async function getAgentStatus(): Promise<AgentStatusResponse[]> {
  return await getAgentsStatus();
}

// ─── Fetch Vehicles dari Backend Ridho ──────────────────────
export async function getVehiclesPositions(): Promise<VehicleLiveResponse[]> {
  console.log("🔍 [getVehiclesPositions] Fetching vehicles...");

  const backendData = await fetchWithRetry<Record<string, unknown>>("/api/vehicles/positions");

  if (!backendData) {
    console.warn("⚠️ [getVehiclesPositions] No response from backend");
    return [];
  }

  console.log("[getVehiclesPositions] 📦 Raw response keys:", Object.keys(backendData));

  const vehicles = extractArray(backendData, ["vehicles", "data", "results", "items", "positions", "fleet"]);

  if (!vehicles || vehicles.length === 0) {
    console.warn("⚠️ [getVehiclesPositions] No vehicles array found");
    console.log("[getVehiclesPositions] 📦 Full response:", JSON.stringify(backendData).substring(0, 1000));
    return [];
  }

  console.log("✅ [getVehiclesPositions] Vehicles fetched:", vehicles.length);

  return vehicles.map((v: unknown) => {
    const vehicle = v as Record<string, unknown>;
    return {
      id: (vehicle.id as string) || (vehicle.vehicleId as string) || (vehicle.vehicle_id as string) || "unknown",
      name: (vehicle.name as string) || (vehicle.vehicle_name as string) || (vehicle.vehicleId as string) || "Unknown Vehicle",
      lat: (vehicle.lat as number) || (vehicle.latitude as number) || 0,
      lon: (vehicle.lon as number) || (vehicle.lng as number) || (vehicle.longitude as number) || 0,
      speed: (vehicle.speed as number) || (vehicle.velocity as number) || 0,
      status: (vehicle.status as string) || (vehicle.state as string) || "unknown",
      fuel: (vehicle.fuel as number) || (vehicle.fuel_level as number) || (vehicle.fuelLevel as number) || 0,
      zone: (vehicle.zone as string) || (vehicle.area as string) || (vehicle.location as string) || "Unknown",
      operator: (vehicle.operator as string) || (vehicle.driver as string) || (vehicle.operator_name as string) || "Unknown",
      load_weight: (vehicle.load_weight as number) || (vehicle.loadWeight as number) || (vehicle.weight as number) || 0,
      heading: (vehicle.heading as number) || (vehicle.direction as number) || 0,
      timestamp: (vehicle.timestamp as string) || (vehicle.updated_at as string) || (vehicle.last_update as string) || new Date().toISOString(),
    };
  });
}

export async function getVehiclesLive(): Promise<VehicleLiveResponse[]> {
  return await getVehiclesPositions();
}

// ─── AGGRESSIVE DEBUG: Log semua info tentang sebuah value ──
function aggressiveLog(label: string, value: unknown, indent: string = ""): void {
  const type = typeof value;

  if (value === null) {
    console.log(`${indent}[${label}] NULL`);
    return;
  }
  if (value === undefined) {
    console.log(`${indent}[${label}] UNDEFINED`);
    return;
  }
  if (type === "boolean") {
    console.log(`${indent}[${label}] BOOLEAN:`, value);
    return;
  }
  if (type === "number") {
    console.log(`${indent}[${label}] NUMBER:`, value);
    return;
  }
  if (type === "string") {
    console.log(`${indent}[${label}] STRING (${(value as string).length} chars):`, (value as string).substring(0, 200));
    return;
  }
  if (type === "symbol") {
    console.log(`${indent}[${label}] SYMBOL:`, (value as symbol).toString());
    return;
  }
  if (type === "function") {
    console.log(`${indent}[${label}] FUNCTION`);
    return;
  }
  if (Array.isArray(value)) {
    console.log(`${indent}[${label}] ARRAY[${value.length}]`);
    value.slice(0, 3).forEach((item, i) => {
      aggressiveLog(`[${i}]`, item, indent + "  ");
    });
    if (value.length > 3) {
      console.log(`${indent}  ... and ${value.length - 3} more items`);
    }
    return;
  }
  if (value instanceof Date) {
    console.log(`${indent}[${label}] DATE:`, value.toISOString());
    return;
  }
  if (value instanceof Map) {
    console.log(`${indent}[${label}] MAP(size=${(value as Map<unknown, unknown>).size})`);
    return;
  }
  if (value instanceof Set) {
    console.log(`${indent}[${label}] SET(size=${(value as Set<unknown>).size})`);
    return;
  }
  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    console.log(`${indent}[${label}] OBJECT{${keys.join(", ") || "no keys"}}`);

    for (const key of keys.slice(0, 10)) {
      const val = obj[key];
      const valType = typeof val;
      if (valType === "number" || valType === "string" || valType === "boolean") {
        console.log(`${indent}  .${key} = ${valType}:`, val);
      } else if (val === null) {
        console.log(`${indent}  .${key} = null`);
      } else if (Array.isArray(val)) {
        console.log(`${indent}  .${key} = Array[${val.length}]`);
      } else if (typeof val === "object") {
        console.log(`${indent}  .${key} = Object{${Object.keys(val as object).join(", ")}}`);
      } else {
        console.log(`${indent}  .${key} = ${valType}`);
      }
    }
    if (keys.length > 10) {
      console.log(`${indent}  ... and ${keys.length - 10} more keys`);
    }
    return;
  }

  console.log(`${indent}[${label}] UNKNOWN TYPE:`, type, value);
}

// ─── Fetch Emissions dari Backend Ridho ─────────────────────
// FIXED v9: AGGRESSIVE logging untuk debug format APAPUN
export async function getEmissionsToday(): Promise<EmissionData | null> {
  console.log("🔍 [getEmissionsToday] Fetching emissions...");

  const backendData = await fetchWithRetry<unknown>("/api/emissions/today");

  if (!backendData) {
    console.warn("⚠️ [getEmissionsToday] No response from backend");
    return null;
  }

  // AGGRESSIVE DEBUG
  console.log("%c[getEmissionsToday] 📦 === AGGRESSIVE DEBUG START ===", "color: #ff0000; font-size: 14px; font-weight: bold;");
  aggressiveLog("backendData", backendData);
  console.log("%c[getEmissionsToday] 📦 === AGGRESSIVE DEBUG END ===", "color: #ff0000; font-size: 14px; font-weight: bold;");

  // ─── Strategy 1-8: Format yang sudah dikenal ──

  // Strategy 1: Direct fields
  if (typeof backendData === "object" && backendData !== null) {
    const obj = backendData as Record<string, unknown>;

    const hasDirectFields = 
      obj.co2 !== undefined ||
      obj.co2_emission !== undefined ||
      obj.nox !== undefined ||
      obj.pm25 !== undefined ||
      obj.fuelEfficiency !== undefined ||
      obj.fuel_efficiency !== undefined ||
      obj.efficiency !== undefined;

    if (hasDirectFields) {
      console.log("✅ [getEmissionsToday] Format: direct fields");
      return {
        co2: extractNumber(backendData, "co2", "co2_emission", "co2Emission", "emissions.co2", "data.co2") || 0,
        nox: extractNumber(backendData, "nox", "nox_emission", "noxEmission", "emissions.nox", "data.nox") || 0,
        pm25: extractNumber(backendData, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25", "emissions.pm25", "data.pm25") || 0,
        fuelEfficiency: extractNumber(backendData, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency", "emissions.fuelEfficiency", "data.fuelEfficiency") || 0,
        timestamp: extractString(backendData, "timestamp", "date", "time", "updated_at", "created_at", "emissions.timestamp", "data.timestamp") || new Date().toISOString(),
        fleet_total_24h: extractNumber(backendData, "fleet_total_24h", "total_24h", "total24h", "fleet_total", "emissions.fleet_total_24h", "data.fleet_total_24h") || undefined,
        total_vehicles: extractNumber(backendData, "total_vehicles", "vehicle_count", "vehicleCount", "count", "emissions.total_vehicles", "data.total_vehicles") || undefined,
        avg_emission: extractNumber(backendData, "avg_emission", "average", "avg", "mean", "emissions.avg_emission", "data.avg_emission") || undefined,
      };
    }

    // Strategy 2: Nested "emissions"
    if (obj.emissions && typeof obj.emissions === "object" && !Array.isArray(obj.emissions)) {
      console.log("✅ [getEmissionsToday] Format: nested 'emissions' object");
      const e = obj.emissions as Record<string, unknown>;
      return {
        co2: extractNumber(e, "co2", "co2_emission", "co2Emission") || 0,
        nox: extractNumber(e, "nox", "nox_emission", "noxEmission") || 0,
        pm25: extractNumber(e, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25") || 0,
        fuelEfficiency: extractNumber(e, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency") || 0,
        timestamp: extractString(e, "timestamp", "date", "time", "updated_at") || 
                   extractString(obj, "timestamp", "date") || 
                   new Date().toISOString(),
        fleet_total_24h: extractNumber(e, "fleet_total_24h", "total_24h", "fleet_total") || 
                         extractNumber(obj, "fleet_total_24h") || undefined,
        total_vehicles: extractNumber(e, "total_vehicles", "vehicle_count", "count") || 
                        extractNumber(obj, "total_vehicles") || undefined,
        avg_emission: extractNumber(e, "avg_emission", "average", "avg", "mean") || 
                      extractNumber(obj, "avg_emission") || undefined,
      };
    }

    // Strategy 3: Nested "data" object
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      console.log("✅ [getEmissionsToday] Format: nested 'data' object");
      const e = obj.data as Record<string, unknown>;
      return {
        co2: extractNumber(e, "co2", "co2_emission", "co2Emission") || 0,
        nox: extractNumber(e, "nox", "nox_emission", "noxEmission") || 0,
        pm25: extractNumber(e, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25") || 0,
        fuelEfficiency: extractNumber(e, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency") || 0,
        timestamp: extractString(e, "timestamp", "date", "time", "updated_at") || 
                   extractString(obj, "timestamp", "date") || 
                   new Date().toISOString(),
        fleet_total_24h: extractNumber(e, "fleet_total_24h", "total_24h") || undefined,
        total_vehicles: extractNumber(e, "total_vehicles", "vehicle_count", "count") || undefined,
        avg_emission: extractNumber(e, "avg_emission", "average", "avg") || undefined,
      };
    }

    // Strategy 4: Array "emissions"
    if (obj.emissions && Array.isArray(obj.emissions) && obj.emissions.length > 0) {
      console.log("✅ [getEmissionsToday] Format: 'emissions' array, taking first item");
      const e = obj.emissions[0] as Record<string, unknown>;
      return {
        co2: extractNumber(e, "co2", "co2_emission", "co2Emission") || 0,
        nox: extractNumber(e, "nox", "nox_emission", "noxEmission") || 0,
        pm25: extractNumber(e, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25") || 0,
        fuelEfficiency: extractNumber(e, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency") || 0,
        timestamp: extractString(e, "timestamp", "date", "time") || new Date().toISOString(),
        fleet_total_24h: extractNumber(e, "fleet_total_24h", "total_24h") || undefined,
        total_vehicles: extractNumber(e, "total_vehicles", "vehicle_count", "count") || undefined,
        avg_emission: extractNumber(e, "avg_emission", "average", "avg") || undefined,
      };
    }

    // Strategy 5: Array "data"
    if (obj.data && Array.isArray(obj.data) && obj.data.length > 0) {
      console.log("✅ [getEmissionsToday] Format: 'data' array, taking first item");
      const e = obj.data[0] as Record<string, unknown>;
      return {
        co2: extractNumber(e, "co2", "co2_emission", "co2Emission") || 0,
        nox: extractNumber(e, "nox", "nox_emission", "noxEmotion") || 0,
        pm25: extractNumber(e, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25") || 0,
        fuelEfficiency: extractNumber(e, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency") || 0,
        timestamp: extractString(e, "timestamp", "date", "time") || new Date().toISOString(),
        fleet_total_24h: extractNumber(e, "fleet_total_24h", "total_24h") || undefined,
        total_vehicles: extractNumber(e, "total_vehicles", "vehicle_count", "count") || undefined,
        avg_emission: extractNumber(e, "avg_emission", "average", "avg") || undefined,
      };
    }
  }

  // Strategy 6: Direct array
  if (Array.isArray(backendData) && backendData.length > 0) {
    console.log("✅ [getEmissionsToday] Format: direct array, taking first item");
    const e = backendData[0] as Record<string, unknown>;
    return {
      co2: extractNumber(e, "co2", "co2_emission", "co2Emission") || 0,
      nox: extractNumber(e, "nox", "nox_emission", "noxEmission") || 0,
      pm25: extractNumber(e, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25") || 0,
      fuelEfficiency: extractNumber(e, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency") || 0,
      timestamp: extractString(e, "timestamp", "date", "time") || new Date().toISOString(),
      fleet_total_24h: extractNumber(e, "fleet_total_24h", "total_24h") || undefined,
      total_vehicles: extractNumber(e, "total_vehicles", "vehicle_count", "count") || undefined,
      avg_emission: extractNumber(e, "avg_emission", "average", "avg") || undefined,
    };
  }

  // Strategy 7: String
  if (typeof backendData === "string") {
    console.log("✅ [getEmissionsToday] Format: string response");
    return {
      co2: 0,
      nox: 0,
      pm25: 0,
      fuelEfficiency: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Strategy 8: Number
  if (typeof backendData === "number") {
    console.log("✅ [getEmissionsToday] Format: number response");
    return {
      co2: backendData,
      nox: 0,
      pm25: 0,
      fuelEfficiency: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Strategy 9: CATCH-ALL — Deep scan seluruh object ──
  if (typeof backendData === "object" && backendData !== null) {
    console.log("🔍 [getEmissionsToday] Trying catch-all deep scan...");

    const co2 = deepScanForNumber(backendData, "co2", "co2_emission", "co2Emission", "carbon", "carbon_dioxide");
    const nox = deepScanForNumber(backendData, "nox", "nox_emission", "noxEmission", "nitrogen", "nitrogen_oxide");
    const pm25 = deepScanForNumber(backendData, "pm25", "pm25_emission", "pm25Emission", "pm", "pm_25", "particulate", "particulate_matter");
    const fuelEff = deepScanForNumber(backendData, "fuelEfficiency", "fuel_efficiency", "fuelEff", "efficiency", "fuel_consumption", "consumption");
    const timestamp = deepScanForString(backendData, "timestamp", "date", "time", "updated_at", "created_at", "datetime");
    const fleetTotal = deepScanForNumber(backendData, "fleet_total_24h", "total_24h", "total24h", "fleet_total", "total_emission");
    const totalVehicles = deepScanForNumber(backendData, "total_vehicles", "vehicle_count", "vehicleCount", "count", "fleet_size");
    const avgEmission = deepScanForNumber(backendData, "avg_emission", "average", "avg", "mean", "average_emission");

    if (co2 !== 0 || nox !== 0 || pm25 !== 0 || fuelEff !== 0) {
      console.log("✅ [getEmissionsToday] Format: catch-all deep scan found data!");
      return {
        co2: co2 || 0,
        nox: nox || 0,
        pm25: pm25 || 0,
        fuelEfficiency: fuelEff || 0,
        timestamp: timestamp || new Date().toISOString(),
        fleet_total_24h: fleetTotal || undefined,
        total_vehicles: totalVehicles || undefined,
        avg_emission: avgEmission || undefined,
      };
    }
  }

  // ─── Strategy 10: NULL/EMPTY response ──
  if (backendData === null || (typeof backendData === "object" && Object.keys(backendData).length === 0)) {
    console.log("✅ [getEmissionsToday] Format: null/empty response");
    return {
      co2: 0,
      nox: 0,
      pm25: 0,
      fuelEfficiency: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Strategy 11: Boolean ──
  if (typeof backendData === "boolean") {
    console.log("✅ [getEmissionsToday] Format: boolean response");
    return {
      co2: backendData ? 1 : 0,
      nox: 0,
      pm25: 0,
      fuelEfficiency: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── Strategy 12: Date object ──
  if (backendData instanceof Date) {
    console.log("✅ [getEmissionsToday] Format: Date object");
    return {
      co2: 0,
      nox: 0,
      pm25: 0,
      fuelEfficiency: 0,
      timestamp: backendData.toISOString(),
    };
  }

  console.warn("⚠️ [getEmissionsToday] Unknown response format — ALL strategies failed");
  console.log("[getEmissionsToday] 📦 Response type:", typeof backendData);
  console.log("[getEmissionsToday] 📦 Response value:", backendData);
  return null;
}

// ─── Fetch AI Decisions dari Supabase ONLY ──────────────────
export async function getAIDecisions(): Promise<AIDecision[]> {
  console.log("🔍 [getAIDecisions] Fetching from Supabase...");

  try {
    const { data, error } = await supabase
      .from("ai_decisions")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[getAIDecisions] Supabase error:", error.message);
      return [];
    }

    if (data && data.length > 0) {
      console.log("✅ [getAIDecisions] Decisions from Supabase:", data.length);
      return (data as unknown[]).map((item: unknown) => {
        const d = item as Record<string, unknown>;
        return {
          id: (d.id as string) || `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          decision_text: (d.decision_text as string) || "No decision text",
          triggered_agents: Array.isArray(d.triggered_agents) ? d.triggered_agents as string[] : [],
          priority_level: (d.priority_level as AIDecision["priority_level"]) || "medium",
          timestamp: (d.timestamp as string) || new Date().toISOString(),
          source: (d.source as AIDecision["source"]) || "supabase",
        };
      });
    }

    console.log("ℹ️ [getAIDecisions] No decisions in Supabase");
  } catch (error) {
    console.warn("[getAIDecisions] Supabase unreachable:", error);
  }

  return [];
}

// ─── Realtime Subscription: Supabase ────────────────────────
export function subscribeToAIDecisions(
  callback: (decision: AIDecision) => void
) {
  console.log("[subscribeToAIDecisions] Starting Supabase realtime...");

  const subscription = supabase
    .channel("ai_decisions_realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ai_decisions",
      },
      (payload: { new: Record<string, unknown> }) => {
        console.log("🔔 [Supabase Realtime] New AI decision:", payload.new);
        const raw = payload.new;
        const decision: AIDecision = {
          id: (raw.id as string) || `dec-${Date.now()}`,
          decision_text: (raw.decision_text as string) || "No decision text",
          triggered_agents: Array.isArray(raw.triggered_agents) ? raw.triggered_agents as string[] : [],
          priority_level: (raw.priority_level as AIDecision["priority_level"]) || "medium",
          timestamp: (raw.timestamp as string) || new Date().toISOString(),
          source: (raw.source as AIDecision["source"]) || "supabase",
        };
        callback(decision);
      }
    )
    .subscribe((status: string) => {
      console.log("[subscribeToAIDecisions] Channel status:", status);
    });

  return () => {
    console.log("[subscribeToAIDecisions] Unsubscribing...");
    subscription.unsubscribe();
  };
}

// ─── Health Check ───────────────────────────────────────────
export async function checkBackendHealth(): Promise<{
  backend: boolean;
  supabase: boolean;
}> {
  let backendOk = false;
  let supabaseOk = false;

  try {
    const proxyUrl = `${API_BASE}/api/agents/status`;
    const directUrl = `${BACKEND_DIRECT}/api/agents/status`;

    try {
      const response = await fetchWithTimeout(proxyUrl, {}, 5000);
      backendOk = response.ok;
      console.log("[checkBackendHealth] Proxy check:", backendOk ? "OK" : "FAIL");
    } catch {
      console.log("[checkBackendHealth] Proxy failed, trying direct...");
      try {
        const response = await fetchWithTimeout(directUrl, {}, 5000);
        backendOk = response.ok;
        console.log("[checkBackendHealth] Direct check:", backendOk ? "OK" : "FAIL");
      } catch {
        backendOk = false;
      }
    }
  } catch {
    backendOk = false;
  }

  try {
    const result = await supabase.from("ai_decisions").select("id", { count: "exact", head: true });
    supabaseOk = !result.error;
    console.log("[checkBackendHealth] Supabase check:", supabaseOk ? "OK" : "FAIL");
  } catch {
    supabaseOk = false;
  }

  console.log("[checkBackendHealth] Result:", { backend: backendOk, supabase: supabaseOk });
  return { backend: backendOk, supabase: supabaseOk };
}

// ─── WebSocket Connection Status ────────────────────────────
export function getConnectionStatus(): "online" | "degraded" | "offline" {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "offline";
  }
  return "online";
}
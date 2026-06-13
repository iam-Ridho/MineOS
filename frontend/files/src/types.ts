// src/types.ts
export interface TelemetryStreamItem {
  timestamp: string;
  assetId: string;
  sensor: string;
  metric: string;
  value: number;
  status: "NOMINAL" | "WARNING" | "CRITICAL";
}

export interface Vehicle {
  id: string;
  state: "MOVING" | "LOADING" | "IDLE";
  lat: number;
  lon: number;
  speed: number;
  fuel: number;
  loadWeight: number;
  fatigueScore: number;
  health: number; // 0-100%
  routeProgress: number; // 0-100 % along route
}

export interface AgentLog {
  id: string;
  agent: "Fleet" | "Safety" | "Emission" | "Reclamation" | "System";
  message: string;
  opacity?: number;
}

export interface Agent {
  id: "fleet" | "safety" | "emission" | "reclamation";
  name: string;
  status: "Running" | "Active" | "Processing" | "Idle";
  taskId: string;
  currentTask: string;
  confidence: number;
  attributeLabel1: string;
  attributeValue1: string;
  attributeLabel2?: string;
  attributeValue2?: string;
  logs: AgentLog[];
}

export interface Recommendation {
  id: string;
  agent: "FLEET AGENT" | "SAFETY AGENT" | "EMISSION AGENT";
  time: string;
  message: string;
  actionText?: string;
  actionType: "EXECUTE" | "ALARM" | "SCHEDULE";
  status: "Pending" | "Executed" | "Dismissed";
}

export interface SystemMetrics {
  inferenceLatency: number;
  activeNodes: string;
  globalTokenUsage: number;
  logicConsistency: number;
}
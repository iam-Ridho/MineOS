import { FleetAgent } from '@/types/fleet';
import { Agent, Recommendation, TelemetryStreamItem } from '@/types';

export type AgentStatus = "active" | "idle" | "error" | "offline";

export const mockAgents: FleetAgent[] = [
  {
    id: "HAUL-01",
    name: "Haul Truck 01",
    status: "active",
    type: "heavy_equipment",
    battery: 85,
    fuel: 68,
    engine_temp: 82,
    sensor_status: "healthy",
    location: { lat: -1.99219, lon: 115.87023 },
    speed: 32.4,
    heading: 45,
    operator: "John Doe",
    zone: "Pit A",
    capacity: 200,
    load_weight: 184.2,
    timestamp: new Date().toISOString()
  },
  {
    id: "LOAD-04",
    name: "Loader 04",
    status: "idle",
    type: "heavy_equipment",
    battery: 60,
    fuel: 54,
    engine_temp: 75,
    sensor_status: "warning",
    location: { lat: -1.84968, lon: 115.81718 },
    speed: 0,
    heading: 0,
    operator: "Jane Smith",
    zone: "Pit B",
    capacity: 150,
    load_weight: 145.8,
    timestamp: new Date().toISOString()
  }
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "fleet",
    name: "Fleet Agent",
    status: "Running",
    taskId: "FLEET-001",
    currentTask: "Optimizing haul routes",
    confidence: 94.5,
    attributeLabel1: "Active Vehicles",
    attributeValue1: "12",
    attributeLabel2: "Avg Fuel",
    attributeValue2: "68%",
    logs: []
  },
  {
    id: "safety",
    name: "Safety Agent",
    status: "Active",
    taskId: "SAFE-001",
    currentTask: "Monitoring fatigue levels",
    confidence: 98.2,
    attributeLabel1: "Alerts",
    attributeValue1: "0",
    logs: []
  },
  {
    id: "emission",
    name: "Emission Agent",
    status: "Processing",
    taskId: "EMIS-001",
    currentTask: "Calculating carbon footprint",
    confidence: 91.0,
    attributeLabel1: "CO2 Level",
    attributeValue1: "Low",
    logs: []
  },
  {
    id: "reclamation",
    name: "Reclamation Agent",
    status: "Idle",
    taskId: "RECL-001",
    currentTask: "Waiting for schedule",
    confidence: 100,
    attributeLabel1: "Zone Coverage",
    attributeValue1: "85%",
    logs: []
  }
];

export const INITIAL_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-001",
    agent: "FLEET AGENT",
    time: "10:30 AM",
    message: "Reroute HAUL-01 to avoid congestion",
    actionText: "Apply Route",
    actionType: "EXECUTE",
    status: "Pending"
  },
  {
    id: "rec-002",
    agent: "SAFETY AGENT",
    time: "10:45 AM",
    message: "Operator fatigue detected on LOAD-04",
    actionText: "Alert Operator",
    actionType: "ALARM",
    status: "Pending"
  }
];

export const INITIAL_TELEMETRY: TelemetryStreamItem[] = [
  {
    timestamp: "10:30:00",
    assetId: "HAUL-01",
    sensor: "GPS",
    metric: "TPH",
    value: 450,
    status: "NOMINAL"
  },
  {
    timestamp: "10:31:00",
    assetId: "LOAD-04",
    sensor: "FUEL",
    metric: "Fuel Level",
    value: 54,
    status: "WARNING"
  }
];

export const PRODUCTION_YIELD_WEEK = [
  { name: "MON", Actual: 84000, Target: 75000 },
  { name: "TUE", Actual: 112000, Target: 75000 },
  { name: "WED", Actual: 62000, Target: 75000 },
  { name: "THU", Actual: 128000, Target: 75000 },
  { name: "FRI", Actual: 109000, Target: 75000 },
  { name: "SAT", Actual: 91000, Target: 75000 },
  { name: "SUN", Actual: 122000, Target: 75000 }
];
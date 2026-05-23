// ─── Agent Types ─────────────────────────────────────────────────────────────

export type AgentStatus = "active" | "idle" | "error" | "offline";

export interface ActivityLog {
  time: string;
  event: string;
}

export interface ErrorLog {
  time: string;
  code: string;
  message: string;
}

export interface BaseAgent {
  id: string;
  name: string;
  status: AgentStatus;
  location: { lat: number; lon: number };
  battery: number;
  lastOnline: string;
}

export interface HeavyEquipmentAgent extends BaseAgent {
  type: "heavy_equipment";
  vehicleModel: string;
  vehicleType: string;
  engineTemp: number; // °C
  fuel: number; // %
  lastActivity: string;
  sensorStatus: "normal" | "warning" | "fault";
  connection: "connected" | "weak" | "disconnected";
  activityHistory: ActivityLog[];
  errorLog: ErrorLog[];
}

export interface SafetyAgentType extends BaseAgent {
  type: "safety";
  cameraStatus: "online" | "offline" | "degraded";
  emergencyAlert: boolean;
  workerDetection: number; // workers detected
  helmetDetection: { compliant: number; nonCompliant: number };
  alarmStatus: "clear" | "active" | "silenced";
  incidentHistory: ActivityLog[];
  connection: "connected" | "weak" | "disconnected";
  lastActivity: string;
}

export type Agent = HeavyEquipmentAgent | SafetyAgentType;

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const mockAgents: Agent[] = [
  {
    id: "agent-001",
    name: "Excavator Alpha",
    type: "heavy_equipment",
    status: "active",
    location: { lat: 0.5167, lon: 117.4167 },
    battery: 87,
    vehicleModel: "Komatsu PC2000-11",
    vehicleType: "Hydraulic Excavator",
    engineTemp: 82,
    fuel: 74,
    lastActivity: "Excavating pit zone A-3",
    sensorStatus: "normal",
    connection: "connected",
    lastOnline: "2026-05-21 16:08",
    activityHistory: [
      { time: "16:05", event: "Mulai sesi penggalian zona A-3" },
      { time: "15:30", event: "Berpindah dari zona A-2 ke A-3" },
      { time: "14:55", event: "Pengisian bahan bakar selesai" },
      { time: "13:10", event: "Penggalian zona A-2 selesai" },
    ],
    errorLog: [],
  },
  {
    id: "agent-002",
    name: "Excavator Beta",
    type: "heavy_equipment",
    status: "idle",
    location: { lat: 0.518, lon: 117.422 },
    battery: 62,
    vehicleModel: "Caterpillar 390F",
    vehicleType: "Hydraulic Excavator",
    engineTemp: 65,
    fuel: 55,
    lastActivity: "Menunggu instruksi operator",
    sensorStatus: "normal",
    connection: "connected",
    lastOnline: "2026-05-21 15:47",
    activityHistory: [
      { time: "15:47", event: "Masuk mode idle — menunggu instruksi" },
      { time: "14:20", event: "Selesai penggalian zona B-1" },
      { time: "12:00", event: "Mulai penggalian zona B-1" },
    ],
    errorLog: [],
  },
  {
    id: "agent-003",
    name: "Loader Prime",
    type: "heavy_equipment",
    status: "active",
    location: { lat: 0.515, lon: 117.415 },
    battery: 91,
    vehicleModel: "LiuGong 899H",
    vehicleType: "Wheel Loader",
    engineTemp: 78,
    fuel: 88,
    lastActivity: "Loading material ke Hauler X1",
    sensorStatus: "normal",
    connection: "connected",
    lastOnline: "2026-05-21 16:09",
    activityHistory: [
      { time: "16:00", event: "Memuat material ke Hauler X1" },
      { time: "15:15", event: "Bergerak ke area stockpile C" },
      { time: "14:30", event: "Pengisian selesai — siap beroperasi" },
    ],
    errorLog: [],
  },
  {
    id: "agent-004",
    name: "Hauler X1",
    type: "heavy_equipment",
    status: "idle",
    location: { lat: 0.5155, lon: 117.418 },
    battery: 45,
    vehicleModel: "Komatsu 930E-5",
    vehicleType: "Mining Dump Truck",
    engineTemp: 70,
    fuel: 40,
    lastActivity: "Menunggu muatan dari Loader Prime",
    sensorStatus: "warning",
    connection: "connected",
    lastOnline: "2026-05-21 15:55",
    activityHistory: [
      { time: "15:55", event: "Idle — menunggu di area loading" },
      { time: "15:10", event: "Selesai membuang muatan di disposal area" },
      { time: "14:00", event: "Berangkat ke disposal area dengan muatan penuh" },
    ],
    errorLog: [
      { time: "14:45", code: "WARN-012", message: "Sensor tekanan ban kiri belakang di bawah normal" },
    ],
  },
  {
    id: "agent-005",
    name: "Driller Sigma",
    type: "heavy_equipment",
    status: "error",
    location: { lat: 0.514, lon: 117.42 },
    battery: 23,
    vehicleModel: "Epiroc PitViper 275",
    vehicleType: "Rotary Drill Rig",
    engineTemp: 105,
    fuel: 18,
    lastActivity: "Pengeboran dihentikan — gangguan sistem",
    sensorStatus: "fault",
    connection: "weak",
    lastOnline: "2026-05-21 15:02",
    activityHistory: [
      { time: "15:02", event: "Sistem pengeboran berhenti otomatis" },
      { time: "14:50", event: "Peringatan suhu mesin tinggi" },
      { time: "13:30", event: "Mulai pengeboran titik D-7" },
    ],
    errorLog: [
      { time: "15:02", code: "ERR-041", message: "Overheating — mesin melebihi 100°C" },
      { time: "14:50", code: "WARN-039", message: "Suhu mesin mendekati batas kritis" },
      { time: "13:55", code: "WARN-021", message: "Baterai di bawah 30%" },
    ],
  },
  {
    id: "agent-006",
    name: "Safety Agent",
    type: "safety",
    status: "active",
    location: { lat: 0.516, lon: 117.417 },
    battery: 99,
    cameraStatus: "online",
    emergencyAlert: false,
    workerDetection: 14,
    helmetDetection: { compliant: 13, nonCompliant: 1 },
    alarmStatus: "clear",
    connection: "connected",
    lastOnline: "2026-05-21 16:10",
    lastActivity: "Monitoring zona aktif — semua kamera online",
    incidentHistory: [
      { time: "11:30", event: "Pekerja tanpa helm terdeteksi di zona B-2 — sudah ditangani" },
      { time: "09:15", event: "Uji alarm rutin selesai — sistem normal" },
      { time: "07:00", event: "Sistem keselamatan diaktifkan untuk shift pagi" },
    ],
  },
];

// ─── KPI & Production (unchanged) ────────────────────────────────────────────

export const mockKPIs = {
  totalAgents: 12,
  activeAgents: 8,
  alertCount: 3,
  productionRateToday: 4820,
};

export const mockProductionData = [
  { date: "2026-05-14", production: 4500 },
  { date: "2026-05-15", production: 4780 },
  { date: "2026-05-16", production: 4200 },
  { date: "2026-05-17", production: 5100 },
  { date: "2026-05-18", production: 4820 },
  { date: "2026-05-19", production: 4950 },
  { date: "2026-05-20", production: 4820 },
];
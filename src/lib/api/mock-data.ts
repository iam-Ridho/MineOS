export const mockAgents = [
  {
    id: "agent-001",
    name: "Excavator Alpha",
    status: "active",
    location: { lat: -1.8994, lon: 115.86970 },
    battery: 87,
  },
  {
    id: "agent-002",
    name: "Haul Truck Beta",
    status: "idle",
    location: { lat: -1.91366, lon: 115.86868 },
    battery: 62,
  },
  {
    id: "agent-003",
    name: "Drill Unit Gamma",
    status: "error",
    location: { lat: -1.94182, lon: 115.85392 },
    battery: 23,
  },
];

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
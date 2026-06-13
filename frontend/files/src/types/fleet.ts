export interface FleetAgent {
  id: string;              // vehicle_id dari vehicle_positions
  name: string;
  status: string;          // "active" | "idle" | "error" | "offline"
  type: string;            // dari vehicles.type
  fuel: number;            // dari vehicle_positions.fuel_pct
  location: { lat: number; lon: number };  // dari vehicle_positions.latitude/longitude
  speed: number;            // dari vehicle_positions.speed_kmh
  heading: number;          // dari vehicle_positions.heading_deg
  operator: string;         // dari vehicle_positions.operator_name
  zone: string;             // dari vehicle_positions.zone
  capacity: number;        // dari vehicles.capacity_ton
  load_weight: number;      // dari vehicle_positions.load_weight_ton
  timestamp?: string;       // dari vehicle_positions.timestamp
}
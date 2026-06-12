export interface FleetAgent {
  id: string;
  name: string;
  status: string;
  type: string;
  battery: number;
  fuel: number;
  engine_temp: number;
  sensor_status: string;
  location: { lat: number; lon: number };
  speed: number;
  heading: number;
  operator: string;
  zone: string;
  capacity: number;
  load_weight: number;
  timestamp?: string;
}
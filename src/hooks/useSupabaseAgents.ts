// src/hooks/useSupabaseAgents.ts
import { useEffect, useState } from 'react';
import { FleetAgent } from '@/types/fleet';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function useSupabaseAgents() {
  const [agents, setAgents] = useState<FleetAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAgents = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/vehicle_positions?select=*&order=timestamp.desc&limit=100`,
          {
            headers: {
              'apikey': SUPABASE_KEY!,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        if (!Array.isArray(data) || data.length === 0) {
          setAgents([]);
          setLoading(false);
          return;
        }

        // Ambil hanya record terbaru per vehicle_id
        const latestByVehicle = new Map();
        data.forEach((pos: any) => {
          const vid = pos.vehicle_id;
          if (!latestByVehicle.has(vid)) {
            latestByVehicle.set(vid, pos);
          }
        });

        const mapped: FleetAgent[] = Array.from(latestByVehicle.values()).map((v: any) => {
          const fuel = v.fuel_pct ?? 0;
          return {
            id: v.vehicle_id,
            name: v.operator_name || `Vehicle-${v.vehicle_id}`,
            status: fuel > 20 ? 'active' : fuel > 5 ? 'idle' : 'error',
            type: 'heavy_equipment',
            battery: Math.round(fuel * 0.8),
            fuel: fuel,
            engine_temp: 75 + Math.random() * 30,
            sensor_status: fuel > 20 ? 'healthy' : fuel > 5 ? 'warning' : 'critical',
            location: {
              lat: v.latitude,
              lon: v.longitude,
            },
            speed: v.speed_kmh || 0,
            heading: v.heading_deg || 0,
            operator: v.operator_name || 'Unassigned',
            zone: v.zone || 'Unknown',
            capacity: 0,
            load_weight: v.load_weight_ton || 0,
            timestamp: v.timestamp,
          };
        });

        if (isMounted) {
          setAgents(mapped);
          setLoading(false);
        }

      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 10000); // Poll setiap 10 detik

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { agents, loading, error };
}
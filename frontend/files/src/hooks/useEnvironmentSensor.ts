// hooks/useEnvironmentSensor.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export interface EnvironmentSensor {
  zone: string;
  slope_degree: number;
  rainfall_mm: number;
  wind_speed_ms: number;
  weather_forecast: string;
  rain_probability_2h: number;
  timestamp: string;
}

const EMPTY: EnvironmentSensor = {
  zone: "–",
  slope_degree: 0,
  rainfall_mm: 0,
  wind_speed_ms: 0,
  weather_forecast: "–",
  rain_probability_2h: 0,
  timestamp: "",
};

export function useEnvironmentSensor() {
  const [sensor,  setSensor]  = useState<EnvironmentSensor>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const channelRef    = useRef<any>(null);
  const reconnectRef  = useRef<any>(null);

  // Simpan fungsi di ref agar tidak masuk dependency array
  // dan tidak menyebabkan useEffect re-run setiap render.
  const fetchRef = useRef(async () => {
    console.log("[env] fetching...");
    try {
      const { data, error: err } = await supabase
        .from("environment_sensors")
        .select("zone, slope_degree, rainfall_mm, wind_speed_ms, weather_forecast, rain_probability_2h, timestamp")
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("[env] result:", data, err);
      if (err) throw err;
      if (data) setSensor(data as EnvironmentSensor);
      setError(null);
    } catch (err: any) {
      console.warn("[env] fetchLatest error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  });

  const subscribeRef = useRef(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`env_sensor_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "environment_sensors" },
        (payload: any) => {
          if (payload.new) setSensor(payload.new as EnvironmentSensor);
        }
      )
      .subscribe((status: string) => {
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          if (reconnectRef.current) return;
          reconnectRef.current = setTimeout(() => {
            reconnectRef.current = null;
            subscribeRef.current();
            fetchRef.current();
          }, 5000);
        }
      });
  });

  // Dependency array kosong — hanya jalan sekali saat mount
  useEffect(() => {
    fetchRef.current();
    subscribeRef.current();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return { sensor, loading, error };
}
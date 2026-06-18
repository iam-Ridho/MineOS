// hooks/useOperatorFatigue.ts
// Realtime subscription ke tabel operator_fatigue.
//
// Ada dua mode penggunaan:
//
// 1. useOperatorFatigueAll() — subscribe semua kendaraan, untuk sidebar unit list.
//    Menyimpan state Map<vehicle_id, FatigueData> agar setiap unit bisa
//    dicek apakah fatiguenya tinggi tanpa fetch tambahan saat render.
//
// 2. useOperatorFatigueUnit(vehicleId) — subscribe satu kendaraan, untuk AgentModal.
//    Unsubscribe otomatis saat vehicleId berubah atau komponen unmount.
//    Menggunakan filter server-side agar tidak menerima data kendaraan lain.
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── TYPE ─────────────────────────────────────────────────────────────────────

export interface FatigueData {
  vehicle_id: string;
  operator_name: string;
  fatigue_score: number;       // 0.0 – 1.0
  shift_hours: number;
  heart_rate: number;
  eyes_closed_ratio: number;   // 0.0 – 1.0
  timestamp: string;
}

// Threshold untuk UI color coding
export const FATIGUE_LEVEL = {
  safe:     { max: 0.4, label: "NORMAL",  color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-300",  dot: "bg-blue-400"   },
  moderate: { max: 0.7, label: "WASPADA", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-300", dot: "bg-amber-400"  },
  high:     { max: 1.0, label: "KRITIS",  color: "text-red-500",   bg: "bg-red-50",   border: "border-red-400",   dot: "bg-red-500"    },
} as const;

export function getFatigueLevel(score: number) {
  if (score < FATIGUE_LEVEL.safe.max)     return FATIGUE_LEVEL.safe;
  if (score < FATIGUE_LEVEL.moderate.max) return FATIGUE_LEVEL.moderate;
  return FATIGUE_LEVEL.high;
}

// ─── HOOK 1: SEMUA UNIT (untuk sidebar) ──────────────────────────────────────
// Subscribe ke semua INSERT baru, update Map per vehicle_id.
// Initial fetch mengambil record terbaru per vehicle.

export function useOperatorFatigueAll() {
  // Map<vehicle_id, FatigueData> — lebih efisien dari array untuk lookup per unit
  const [fatigueMap, setFatigueMap] = useState<Map<string, FatigueData>>(new Map());
  const channelRef = useRef<any>(null);
  const reconnectRef = useRef<any>(null);

  const subscribeRef = useRef(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase
      .channel(`operator_fatigue_all_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "operator_fatigue" },
        (payload: any) => {
          const row = payload.new as FatigueData;
          if (!row?.vehicle_id) return;
          setFatigueMap((prev) => {
            const next = new Map(prev);
            next.set(row.vehicle_id, row);
            return next;
          });
        }
      )
      .subscribe((status: string) => {
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          if (reconnectRef.current) return;
          reconnectRef.current = setTimeout(() => {
            reconnectRef.current = null;
            subscribeRef.current();
          }, 5000);
        }
      });
  });

  useEffect(() => {
    // Initial fetch — ambil record terbaru per vehicle_id
    // Supabase tidak support DISTINCT ON via JS client, jadi ambil 100
    // terbaru lalu ambil yang paling baru per vehicle di sisi client.
    supabase
      .from("operator_fatigue")
      .select("vehicle_id, operator_name, fatigue_score, shift_hours, heart_rate, eyes_closed_ratio, timestamp")
      .order("timestamp", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, FatigueData>();
        // Data sudah diurutkan terbaru dulu — ambil yang pertama per vehicle
        data.forEach((row: any) => {
          if (!map.has(row.vehicle_id)) map.set(row.vehicle_id, row as FatigueData);
        });
        setFatigueMap(map);
      });

    subscribeRef.current();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  return fatigueMap;
}

// ─── HOOK 2: SATU UNIT (untuk AgentModal) ────────────────────────────────────
// Subscribe dengan filter server-side ke satu vehicle_id.
// Re-subscribe otomatis saat vehicleId berubah (modal ganti unit).
// Unsubscribe saat vehicleId null (modal ditutup).

export function useOperatorFatigueUnit(vehicleId: string | null) {
  const [fatigue, setFatigue] = useState<FatigueData | null>(null);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Cleanup channel sebelumnya
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (!vehicleId) {
      setFatigue(null);
      return;
    }

    setLoading(true);

    // Initial fetch untuk unit ini
    supabase
      .from("operator_fatigue")
      .select("vehicle_id, operator_name, fatigue_score, shift_hours, heart_rate, eyes_closed_ratio, timestamp")
      .eq("vehicle_id", vehicleId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        console.log('[fatigue] fetch result:', { vehicleId, data, error });
        if (data && data.length > 0) setFatigue(data[0] as FatigueData);
        setLoading(false);
      });

    // Realtime subscription dengan filter server-side
    // Filter ini membuat Supabase hanya mengirim payload untuk vehicle ini,
    // bukan semua INSERT ke tabel operator_fatigue.
    channelRef.current = supabase
      .channel(`fatigue_unit_${vehicleId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "operator_fatigue",
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload: any) => {
          setFatigue(payload.new as FatigueData);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [vehicleId]); // Re-run saat modal ganti unit atau ditutup

  return { fatigue, loading };
}
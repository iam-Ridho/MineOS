"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface FleetAgent {
  id: string;
  name: string;
  status: string;
  type: string;
  location: { lat: number; lon: number };
  speed: number;
  heading: number;
  fuel: number;
  load_weight: number;
  capacity: number;
  zone: string;
  operator: string;
  vehicleModel?: string;
  speed_kmh?: number;
  heading_deg?: number;
  fuel_pct?: number;
  load_weight_ton?: number;
  capacity_ton?: number;
  timestamp?: string;
}

// ── INFER TYPE DARI VEHICLE_ID ────────────────────────────────────────────────
function inferTypeFromId(id: string): string {
  if (!id) return "haul_truck";
  const prefix = id.split("-")[0]?.toUpperCase();
  switch (prefix) {
    case "HD":  return "haul_truck";
    case "CAT": return "haul_truck";
    case "EX":  return "excavator";
    case "DZ":  return "dozer";
    case "GR":  return "grader";
    case "WT":  return "support";
    default:    return "haul_truck";
  }
}

// ── NORMALIZE VEHICLE TYPE ────────────────────────────────────────────────────
function normalizeVehicleType(rawType: string | undefined | null, vehicleId: string): string {
  if (!rawType) return inferTypeFromId(vehicleId);
  const t = rawType.toLowerCase().trim().replace(/[\s_-]+/g, "_");
  if (t === "excavator" || t.startsWith("excav") || t === "shovel" || t === "backhoe") return "excavator";
  if (t === "dozer" || t === "bulldozer" || t.startsWith("bulldoz")) return "dozer";
  if (t === "grader" || t === "motor_grader" || t.startsWith("grad")) return "grader";
  if (t === "support" || t === "utility" || t === "service" || t === "light_vehicle" || t === "water_truck") return "support";
  if (t === "haul_truck" || t === "hauler" || t === "dump_truck" || t === "dumper" || t === "truck" || t === "mining_truck") return "haul_truck";
  return inferTypeFromId(vehicleId);
}

// ── DERIVE STATUS ─────────────────────────────────────────────────────────────
const STALE_THRESHOLD_MS = 30_000;

function deriveStatus(speedKmh: number | undefined, timestamp: string | undefined): string {
  if (timestamp) {
    const age = Date.now() - new Date(timestamp).getTime();
    if (age > STALE_THRESHOLD_MS) return "offline";
  }
  if ((speedKmh ?? 0) < 0.5) return "idle";
  return "active";
}

function parseFleetAgent(raw: any): FleetAgent {
  const vehicleRow     = raw.vehicles;
  const rawType        = vehicleRow?.type || null;
  const vehicleId      = raw.vehicle_id || raw.id || "unknown";
  const normalizedType = normalizeVehicleType(rawType, vehicleId);
  const timestamp      = raw.timestamp || new Date().toISOString();

  return {
    id:           vehicleId,
    name:         vehicleRow?.name || vehicleId,
    status:       deriveStatus(raw.speed_kmh, timestamp),
    type:         normalizedType,
    location:     { lat: raw.latitude ?? -1.9, lon: raw.longitude ?? 115.8 },
    speed:        raw.speed_kmh ?? 0,
    heading:      raw.heading_deg ?? 0,
    fuel:         raw.fuel_pct ?? 0,
    load_weight:  raw.load_weight_ton ?? 0,
    capacity:     vehicleRow?.capacity_ton ?? 0,
    zone:         raw.zone || "Unknown",
    operator:     raw.operator_name || "Unassigned",
    vehicleModel: vehicleRow?.type || rawType || "Heavy Equipment",
    speed_kmh:    raw.speed_kmh,
    heading_deg:  raw.heading_deg,
    fuel_pct:     raw.fuel_pct,
    load_weight_ton: raw.load_weight_ton,
    capacity_ton:    vehicleRow?.capacity_ton,
    timestamp,
  };
}

// ── HOOK ──────────────────────────────────────────────────────────────────────
export function useSupabaseAgents() {
  const [agents,     setAgents]     = useState<FleetAgent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [wsStatus,   setWsStatus]   = useState<string>("DISCONNECTED");

  // Refs — stabil, tidak trigger re-render
  const channelRef          = useRef<any>(null);
  const reconnectTimerRef   = useRef<any>(null);
  const pollTimerRef        = useRef<any>(null);
  const vehicleCacheRef     = useRef<Map<string, any>>(new Map());

  // ── Batch accumulator ──────────────────────────────────────────────────────
  // Backend insert 12 kendaraan dalam satu batch di broadcaster.py.
  // Supabase realtime mengirim 12 pesan INSERT terpisah sangat cepat (~ms).
  // Tanpa batching: setAgents dipanggil 12x berturut-turut → useEffect CesiumViewer
  // trigger 12x → interpState di-reset 12x dalam 1 frame → lompatan parah.
  // Solusi: kumpulkan semua INSERT dalam window 100ms, baru flush sekali ke setAgents.
  const batchBufferRef      = useRef<Map<string, any>>(new Map()); // vehicle_id → parsed agent
  const batchTimerRef       = useRef<any>(null);

  // ── FETCH INITIAL (REST) ────────────────────────────────────────────────────
  // Tidak pakai useCallback dengan dependency — fungsi ini stabil,
  // tidak perlu di-recreate. Dipakai hanya saat mount + polling.
  const fetchAgentsRef = useRef(async () => {
  try {
    setLoading(true);

    // Query 1: posisi kendaraan — TANPA nested join
    const { data: positions, error: posError } = await supabase
      .from("vehicle_positions")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (posError) throw posError;

    // Ambil hanya record terbaru per vehicle_id
    const latestMap = new Map<string, any>();
    (positions || []).forEach((row: any) => {
      const existing = latestMap.get(row.vehicle_id);
      if (!existing || new Date(row.timestamp) > new Date(existing.timestamp)) {
        latestMap.set(row.vehicle_id, row);
      }
    });

    // Query 2: info kendaraan — TERPISAH, hanya untuk vehicle_id yang relevan
    const vehicleIds = Array.from(latestMap.keys());
    if (vehicleIds.length > 0) {
      const { data: vehicles, error: vehError } = await supabase
        .from("vehicles")
        .select("id, name, type, capacity_ton")
        .in("id", vehicleIds);

      if (vehError) {
        console.warn("Fetch vehicles error (non-fatal):", vehError.message);
      } else {
        (vehicles || []).forEach((v: any) => {
          vehicleCacheRef.current.set(v.id, v);
        });
      }
    }

    // Gabungkan manual: vehicle_positions + vehicles dari cache
    const parsed = Array.from(latestMap.values()).map((row) =>
      parseFleetAgent({ ...row, vehicles: vehicleCacheRef.current.get(row.vehicle_id) ?? null })
    );

    setAgents((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      parsed.forEach((a) => map.set(a.id, a));
      map.forEach((_, id) => {
        if (!latestMap.has(id)) map.delete(id);
      });
      return Array.from(map.values());
    });

    setLastUpdate(Date.now());
    setError(null);
  } catch (err: any) {
    console.error("Fetch agents error:", err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
});

  // ── REALTIME SUBSCRIPTION ───────────────────────────────────────────────────
  // Tidak pakai useCallback — disimpan di ref agar stabil dan tidak
  // memicu useEffect chain re-run saat dependensi berubah.
  const subscribeRef = useRef(() => {
    // Bersihkan channel lama
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      // Nama unik per koneksi agar tidak bentrok dengan channel sisa sebelumnya
      .channel(`fleet_positions_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vehicle_positions" },
        async (payload: any) => {
          const raw = payload.new;
          if (!raw?.vehicle_id) return;

          // Ambil info kendaraan dari cache — tidak ada HTTP request
          let vehicleRow = vehicleCacheRef.current.get(raw.vehicle_id) ?? null;
          if (!vehicleRow) {
            // Fallback: fetch sekali saja jika belum di cache (jarang terjadi)
            try {
              const { data } = await supabase
                .from("vehicles")
                .select("id, name, type, capacity_ton")
                .eq("id", raw.vehicle_id)
                .maybeSingle(); // maybeSingle tidak throw 406 jika 0 rows
              vehicleRow = data ?? null;
              if (vehicleRow) vehicleCacheRef.current.set(raw.vehicle_id, vehicleRow);
            } catch {}
          }

          const newAgent = parseFleetAgent({ ...raw, vehicles: vehicleRow });

          // ── Batch accumulation (100ms window) ──────────────────────────────
          // Backend insert 12 kendaraan hampir bersamaan. Tanpa batching,
          // setAgents dipanggil 12x → useEffect CesiumViewer reset interpState
          // 12x dalam satu frame → kendaraan loncat.
          batchBufferRef.current.set(newAgent.id, newAgent);

          if (batchTimerRef.current) return; // sudah ada timer pending, cukup update buffer

          batchTimerRef.current = setTimeout(() => {
            batchTimerRef.current = null;
            const batch = new Map(batchBufferRef.current);
            batchBufferRef.current.clear();

            setAgents((prev) => {
              const map = new Map(prev.map((a) => [a.id, a]));
              batch.forEach((agent, id) => map.set(id, agent));
              return Array.from(map.values());
            });
            setLastUpdate(Date.now());
          }, 100); // flush setelah 100ms — cukup lama untuk kumpulkan semua 12 INSERT
        }
      )
      .subscribe((status: string) => {
        console.log("📡 Fleet realtime:", status);
        setWsStatus(status);

        if (status === "SUBSCRIBED") {
          // Batalkan reconnect timer yang mungkin sedang pending
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        }

        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          // Guard: jangan dobel-schedule reconnect
          if (reconnectTimerRef.current) return;
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            subscribeRef.current();          // reconnect
            fetchAgentsRef.current();        // sync state setelah reconnect
          }, 5000);
        }
      });

    channelRef.current = channel;
  });

  // ── MOUNT / UNMOUNT ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Initial fetch
    fetchAgentsRef.current();

    // Realtime subscription
    subscribeRef.current();

    // ✅ FIX: Polling interval disesuaikan dengan interval simulator (5 detik).
    // Polling ini sebagai fallback jika realtime terputus — bukan primary update.
    // Karena realtime INSERT sudah handle update tiap 5s, polling ini jarang aktif.
    // ✅ Polling interval 30 detik — hanya sebagai fallback jika realtime putus.
    // Jangan 5 detik: polling 5 detik + realtime INSERT 1.5 detik = interpState
    // di-reset setiap 5 detik meski animasi sedang berjalan → lompatan terlihat.
    // Realtime INSERT sudah handle semua update posisi — polling hanya rekonsiliasi.
    pollTimerRef.current = setInterval(() => {
      fetchAgentsRef.current();
    }, 30_000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pollTimerRef.current)      clearInterval(pollTimerRef.current);
      if (batchTimerRef.current)     clearTimeout(batchTimerRef.current);
    };
  }, []); // ✅ Dependency array kosong — hanya run saat mount/unmount

  console.log("DEBUG useSupabaseAgents:", { agentsLength: agents.length, loading, error, wsStatus });
  return { agents, loading, error, lastUpdate, wsStatus };
}
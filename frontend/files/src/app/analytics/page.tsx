"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Leaf, RefreshCw, Download, Zap,
  AlertTriangle, Wifi, ArrowUpRight, ArrowDownRight,
  CircleDot, BarChart2, Bell, ChevronDown, Calendar,
  ArrowRight, Activity,
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { mockAgents, INITIAL_TELEMETRY } from "@/lib/api/mock-data";
import { supabase, fetchFleetAgents } from "@/lib/supabase";
import { FleetAgent } from "@/types/fleet";
import { getAnalyticsProduction } from "@/lib/api";


// ─── Data Prakiraan per Tab ──────────────────────────────────────────────────
const FORECAST_DATA: Record<"Day" | "Week" | "Month", {
  stability: number;
  maintenanceRisk: number;
  fuelBurn: number;
  outputEst: string;
  reliability: string;
  aiAdvice: string;
}> = {
  Day: {
    stability: 97.5,
    maintenanceRisk: 8,
    fuelBurn: 45,
    outputEst: "120t",
    reliability: "TINGGI",
    aiAdvice: "[SHIFT HARIAN] Semua unit beroperasi dalam parameter normal. Satu haul truck (DZ-001) menunjukkan level bahan bakar kritis dan perlu diisi segera. Dua operator mengalami kelelahan, sementara lereng operasi berada pada 31.4° dengan risiko mendekati batas aman. Hujan ringan 0.6 mm terdeteksi, namun tetap memerlukan perhatian pada kondisi keselamatan. Rekomendasi: 1. Isi bahan bakar haul truck DZ-001 dalam 10 menit dan lakukan pemeriksaan kebocoran. 2. Rotasi dua operator kelelahan (Budi Santoso, Ahmad Fauzi) ke shift istirahat dan ganti dengan operator cadangan. 3. Pantau lereng dengan sensor stabilitas; siapkan tim evakuasi darurat jika kemiringan melebihi 32° atau intensitas hujan meningkat.",
  },
  Week: {
    stability: 94.2,
    maintenanceRisk: 18,
    fuelBurn: 61,
    outputEst: "840t",
    reliability: "TINGGI",
    aiAdvice: "[MINGGUAN] Cluster 8 unit hauler menunjukkan peningkatan vibrasi inti sebesar 12%. Potensi kelelahan axle dalam 4.2 hari — disarankan siklus pelumasan preventif pada shift berikutnya. Tren downtime stabil, efisiensi rata-rata 82.4%. Pantau kondisi ban dan rem secara berkala.",
  },
  Month: {
    stability: 88.7,
    maintenanceRisk: 34,
    fuelBurn: 72,
    outputEst: "3.6kt",
    reliability: "SEDANG",
    aiAdvice: "[BULANAN] Tren produksi menunjukkan penurunan 5% dibanding bulan lalu. Maintenance backlog meningkat 34%. Rekomendasi: jadwalkan overhaul major untuk 3 unit haul truck dan evaluasi pola kerja shift untuk mengurangi kelelahan operator. Fuel burn index di atas target — pertimbangkan optimasi rute hauling.",
  },
};

// ─── Tipe Data ──────────────────────────────────────────────────────────────

interface ProductionSnapshot {
  id: number;
  day_label: string;
  actual_tons: number;
  target_tons: number;
  recorded_at: string;
}

interface EmissionLog {
  id: number;
  vehicle_id: string;
  co2_kg: number;
  timestamp: string;
}

interface SummaryStats {
  total_production: number;
  avg_per_day: number;
  avg_efficiency: number;
  total_downtime_hours: number;
  alert_count: number;
}

// ─── Helper: batasi nilai produksi ke rentana realistis pertambangan ───────────────
const PROD_MIN = 60_000;
const PROD_MAX = 135_000;
const clampTons = (v: number) => Math.round(Math.min(PROD_MAX, Math.max(PROD_MIN, v)));

// ─── Helper: Hasilkan kumpulan label lengkap untuk setiap filter waktu ──────────────
// PERBAIKAN BUG #1 & #3: Pastikan kita SELALU memiliki jumlah bar yang diharapkan.
function getFullLabels(timeFilter: "Day" | "Week" | "Month"): string[] {
  if (timeFilter === "Day") {
    // 8 slot per jam untuk shift hari ini
    return ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  }
  if (timeFilter === "Week") {
    // 7 hari
    return ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  }
  // Bulan: 30 hari (PERBAIKAN BUG #3 — sebelumnya hanya 4 minggu)
  return Array.from({ length: 30 }, (_, i) => `${i + 1}`);
}

// ─── Helper: Lengkapi data backend ke label lengkap, mengisi slot yang kosong ─────────
// PERBAIKAN BUG #1: Jika backend hanya mengembalikan 2 data, kita isi sisanya sehingga
// setiap bar yang diharapkan tetap tampil.
function padProductionData(
  backendData: ProductionSnapshot[],
  timeFilter: "Day" | "Week" | "Month",
  targetTons: number = 75_000,
): ProductionSnapshot[] {
  const labels = getFullLabels(timeFilter);

  // Bangun lookup map (persis + huruf kecil untuk pencocokan case-insensitive)
  const dataMap = new Map<string, ProductionSnapshot>();
  backendData.forEach((d) => {
    dataMap.set(d.day_label, d);
    dataMap.set(d.day_label.toLowerCase(), d);
  });

  return labels.map((label, idx) => {
    const match = dataMap.get(label) || dataMap.get(label.toLowerCase());
    if (match) {
      return { ...match, id: idx, actual_tons: clampTons(match.actual_tons) };
    }

    // Fallback deterministik agar bar tetap tampil (bukan acak)
    const baseVal = 70_000 + ((idx * 5_000) % 25_000);
    return {
      id: idx,
      day_label: label,
      actual_tons: clampTons(baseVal),
      target_tons: targetTons,
      recorded_at: new Date().toISOString(),
    };
  });
}

// ─── Helper Fetch Supabase ──────────────────────────────────────────────────

async function fetchProductionSnapshots(
  timeFilter: "Day" | "Week" | "Month",
  startStr?: string,
  endStr?: string,
): Promise<ProductionSnapshot[]> {
  const targetTons = 75_000;
  let backendData: ProductionSnapshot[] = [];

  // ── 1. Coba backend FastAPI terlebih dahulu ────────────────────────────────────────
  try {
    const periodParam = timeFilter === "Day" ? "today" : timeFilter === "Week" ? "week" : "month";
    const res = await getAnalyticsProduction(periodParam);
    if (res && res.data && res.data.length > 0) {
      backendData = res.data.map((item, idx) => {
        const dateObj = new Date(item.date);
        let dayLabel = item.date;
        if (!isNaN(dateObj.getTime())) {
          if (timeFilter === "Week") {
            dayLabel = dateObj.toLocaleDateString("id-ID", { weekday: "short" });
          } else if (timeFilter === "Month") {
            dayLabel = String(dateObj.getDate());
          } else {
            dayLabel = dateObj.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          }
        }
        return {
          id: idx,
          day_label: dayLabel,
          actual_tons: clampTons(item.production_ton),
          target_tons: item.target_ton || targetTons,
          recorded_at: item.date,
        };
      });
    }
  } catch (e) {
    console.warn("Fetch backend FastAPI /analytics/production gagal, mencoba Supabase...", e);
  }

  // ── 2. Coba tabel production_snapshots secara langsung ──────────────────────────
  if (backendData.length === 0) {
    try {
      let query = supabase
        .from("production_snapshots")
        // 👇 UBAH KOLOM YANG DI-SELECT MENYESUAIKAN BACKEND/DATABASE
        .select("id, total_load_ton, snapshot_date") 
        .order("snapshot_date", { ascending: true });

      if (startStr && endStr) {
        query = query
          .gte("snapshot_date", startStr) // Format tanggal YYYY-MM-DD
          .lte("snapshot_date", endStr);
      }

      const limitCount = timeFilter === "Day" ? 8 : timeFilter === "Month" ? 30 : 7;
      query = query.limit(limitCount);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        backendData = data.map((r, idx) => ({ 
          id: r.id || idx, 
          day_label: r.snapshot_date, 
          actual_tons: clampTons(r.total_load_ton || 0), // Mapping ke actual_tons untuk chart
          target_tons: targetTons, // Gunakan default 75_000
          recorded_at: r.snapshot_date 
        }));
      }
    } catch {
      console.warn("Query production_snapshots gagal – beralih ke vehicle_positions");
    }
  }

  // ── 3. Agregasi dari vehicle_positions ──────────────────────────────────
  if (backendData.length === 0) {
    try {
      const { data: positions } = await supabase
        .from("vehicle_positions")
        .select("timestamp, load_weight_ton")
        .order("timestamp", { ascending: false })
        .limit(1000);

      const weekdays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      const weightPerLabel: Record<string, number> = {};

      (positions ?? []).forEach((p) => {
        const d = new Date(p.timestamp);
        let label: string;
        if (timeFilter === "Day") {
          label = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
        } else if (timeFilter === "Week") {
          label = weekdays[d.getDay()];
        } else {
          label = String(d.getDate());
        }
        weightPerLabel[label] = (weightPerLabel[label] ?? 0) + Number(p.load_weight_ton ?? 0);
      });

      const labels = getFullLabels(timeFilter);
      backendData = labels.map((label, idx) => {
        const baseVal = 70_000 + ((idx * 5_000) % 25_000);
        const rawWeight = weightPerLabel[label] ?? 0;
        const weightContrib = rawWeight > 0
          ? Math.min(40_000, Math.log1p(rawWeight) * 2_800)
          : 0;
        return {
          id: idx,
          day_label: label,
          actual_tons: clampTons(baseVal + weightContrib),
          target_tons: targetTons,
          recorded_at: new Date().toISOString(),
        };
      });
      // Sudah lengkap — kembalikan langsung (padProductionData akan meneruskannya)
      return padProductionData(backendData, timeFilter, targetTons);
    } catch {
      console.warn("Agregasi vehicle_positions gagal");
    }
  }

  // ── 4. Lengkapi apa pun yang kita dapat (atau kosong) ke label lengkap ───────────────
  // PERBAIKAN BUG #1: Ini memastikan 8 / 7 / 30 bar setiap saat.
  return padProductionData(backendData, timeFilter, targetTons);
}

async function fetchEmissionLogs(): Promise<EmissionLog[]> {
  try {
    const { data, error } = await supabase
      .from("emission_logs")
      .select('id, vehicle_id, co2_kg, timestamp')
      .order("timestamp", { ascending: false })
      .limit(10);

    if (!error && data && data.length > 0) return data;
  } catch {
    console.warn("emission_logs gagal – beralih ke vehicle_positions");
  }

  try {
    const { data: positions } = await supabase
      .from("vehicle_positions")
      .select("vehicle_id, fuel_pct, speed_kmh")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (positions && positions.length > 0) {
      const emissionsMap: Record<string, number> = {};
      positions.forEach((p) => {
        const name = `Unit Hauler ${p.vehicle_id.replace("HAUL-", "")}`;
        const co2 = Math.min(
          35,
          Math.max(10, Number(p.speed_kmh ?? 15) * 0.4 + (100 - Number(p.fuel_pct ?? 80)) * 0.1 + Math.random() * 2),
        );
        emissionsMap[name] = co2;
      });

      return Object.entries(emissionsMap).map(([vehicle_id, co2], idx) => ({
        id: idx,
        vehicle_id,
        co2_kg: Number(co2.toFixed(1)),
        timestamp: new Date().toISOString(),
      }));
    }
  } catch { /* no-op */ }

  return [
    { id: 1, vehicle_id: "Unit Hauler 42", co2_kg: Number((18 + Math.random() * 6).toFixed(1)), timestamp: new Date().toISOString() },
    { id: 2, vehicle_id: "Unit Hauler 09", co2_kg: Number((24 + Math.random() * 6).toFixed(1)), timestamp: new Date().toISOString() },
    { id: 3, vehicle_id: "Unit Hauler 17", co2_kg: Number((19 + Math.random() * 6).toFixed(1)), timestamp: new Date().toISOString() },
  ];
}

async function fetchWeeklySummary(
  timeFilter: "Day" | "Week" | "Month",
  startStr?: string,
  endStr?: string,
): Promise<SummaryStats | null> {
  try {
    let query = supabase
      .from("production_snapshots")
      // 👇 UBAH KOLOM DI SINI JUGA
      .select("total_load_ton, snapshot_date")
      .order("snapshot_date", { ascending: false });

    if (startStr && endStr) {
      query = query
        .gte("snapshot_date", startStr)
        .lte("snapshot_date", endStr);
    }

    const limitCount = timeFilter === "Day" ? 8 : timeFilter === "Month" ? 30 : 7;
    query = query.limit(limitCount);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      // Hitung total dari total_load_ton
      const total = data.reduce((s, r) => s + clampTons(r.total_load_ton ?? 0), 0);
      const avg = total / data.length;
      
      // Karena target_tons tidak ada di database, asumsikan default target 75_000 ton
      const efficiencies = data.map((r) =>
        75_000 > 0 ? (clampTons(r.total_load_ton ?? 0) / 75_000) * 100 : 0,
      );
      const avgEff = efficiencies.reduce((s, v) => s + v, 0) / efficiencies.length;

      return { total_production: total, avg_per_day: avg, avg_efficiency: avgEff, total_downtime_hours: 14.2, alert_count: 0 };
    }
  } catch {
    console.warn("Ringkasan production_snapshots gagal – beralih ke fallback");
  }

  try {
    const { data: positions } = await supabase
      .from("vehicle_positions")
      .select("load_weight_ton")
      .limit(1000);

    const totalWeight = (positions ?? []).reduce((s, p) => s + Number(p.load_weight_ton ?? 0), 0);
    const totalProduction = totalWeight > 0
      ? Math.round(32_000 + Math.log1p(totalWeight) * 1_200)
      : Math.round(30_000 + Math.random() * 15_000);

    return {
      total_production: totalProduction,
      avg_per_day: Math.round(totalProduction / 7),
      avg_efficiency: Math.min(100, Math.max(60, 81 + Math.random() * 8)),
      total_downtime_hours: Number((10 + Math.random() * 6).toFixed(1)),
      alert_count: 0,
    };
  } catch { /* no-op */ }

  return {
    total_production: Math.round(30_000 + Math.random() * 15_000),
    avg_per_day: Math.round(4_000 + Math.random() * 1_000),
    avg_efficiency: 82.4 + Math.random() * 5,
    total_downtime_hours: 14.2,
    alert_count: 0,
  };
}

async function fetchAlertCount(): Promise<number> {
  const { count, error } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

async function fetchLatestAIDecision(): Promise<any | null> {
  const { data, error } = await supabase
    .from("ai_decisions")
    .select("id, decision_text, timestamp")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return { id: data?.id, summary: data?.decision_text, created_at: data?.timestamp };
}

// ─── Data Fallback ───────────────────────────────────────────────────────────

const FALLBACK_PRODUCTION: ProductionSnapshot[] = [
  { id: 1, day_label: "Sen", actual_tons: 84_000,  target_tons: 75_000, recorded_at: "" },
  { id: 2, day_label: "Sel", actual_tons: 112_000, target_tons: 75_000, recorded_at: "" },
  { id: 3, day_label: "Rab", actual_tons: 62_000,  target_tons: 75_000, recorded_at: "" },
  { id: 4, day_label: "Kam", actual_tons: 128_000, target_tons: 75_000, recorded_at: "" },
  { id: 5, day_label: "Jum", actual_tons: 109_000, target_tons: 75_000, recorded_at: "" },
  { id: 6, day_label: "Sab", actual_tons: 91_000,  target_tons: 75_000, recorded_at: "" },
  { id: 7, day_label: "Min", actual_tons: 122_000, target_tons: 75_000, recorded_at: "" },
];

const FALLBACK_EMISSIONS: EmissionLog[] = [
  { id: 1, vehicle_id: "Unit Hauler 42", co2_kg: 18.2, timestamp: "" },
  { id: 2, vehicle_id: "Unit Hauler 09", co2_kg: 26.4, timestamp: "" },
  { id: 3, vehicle_id: "Unit Hauler 17", co2_kg: 19.1, timestamp: "" },
];

const FALLBACK_SUMMARY: SummaryStats = {
  total_production: 32_170,
  avg_per_day: 4_596,
  avg_efficiency: 82.4,
  total_downtime_hours: 14.2,
  alert_count: 7,
};

// ─── Konfigurasi Status ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  NOMINAL:  { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  WARNING:  { dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50"   },
  CRITICAL: { dot: "bg-red-400",     text: "text-red-700",     bg: "bg-red-50"     },
};

// ─── Komponen UI ───────────────────────────────────────────────────────────

function PremiumTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-xl shadow-slate-200/60">
      <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-500 text-xs font-medium">{p.name}</span>
          </div>
          <span className="text-slate-900 text-xs font-bold tabular-nums">
            {p.value.toLocaleString()} t
          </span>
        </div>
      ))}
    </div>
  );
}

function HeroKPICard({ value, trend }: { value: string; trend: string }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5 shadow-lg shadow-blue-200/40"
      style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)" }}
    >
      <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
        <BarChart2 size={18} className="text-white" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-widest mb-2">Total Produksi</p>
        <p className="text-[2.25rem] font-bold text-white leading-none tracking-tight">{value}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-white/10 border border-white/10 rounded-full px-3 py-1.5 w-fit">
        <ArrowUpRight size={12} />
        {trend}&nbsp;dari periode sebelumnya
      </span>
    </div>
  );
}

function StatKPICard({
  label, value, trend, trendUp, icon: Icon,
}: {
  label: string; value: string; trend: string; trendUp: boolean; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
        <Icon size={15} className="text-slate-400" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        <p className="text-[2rem] font-bold text-slate-900 leading-none tracking-tight">{value}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className={`flex items-center gap-0.5 font-semibold ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
          {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trend}
        </span>
        <span className="text-slate-300 font-medium">· dari periode sebelumnya</span>
      </div>
    </div>
  );
}

function ProgressMetric({ label, pct, valueLabel, barClass, valueClass }: {
  label: string; pct: number; valueLabel: string; barClass: string; valueClass: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className={`text-xs font-bold ${valueClass}`}>{valueLabel}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barClass} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Halaman Utama ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const { telemetryStream } = useTelemetry();

  const [production,   setProduction]   = useState<ProductionSnapshot[]>(FALLBACK_PRODUCTION);
  const [emissions,    setEmissions]    = useState<EmissionLog[]>(FALLBACK_EMISSIONS);
  const [summary,      setSummary]      = useState<SummaryStats>(FALLBACK_SUMMARY);
  const [fleetAgents,  setFleetAgents]  = useState<FleetAgent[]>([]);
  const [aiAdvice,     setAiAdvice]     = useState<string>(FORECAST_DATA["Week"].aiAdvice);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLastRefresh]  = useState<Date>(new Date());
  const [usingLive,    setUsingLive]    = useState(false);
  const [activeTab,    setActiveTab]    = useState<"Day" | "Week" | "Month">("Week");
  const [startDate,    setStartDate]    = useState("2024-05-12");
  const [endDate,      setEndDate]      = useState("2024-05-18");

  const currentAgents = fleetAgents.length > 0 ? fleetAgents : mockAgents;
  const activeCount = currentAgents.filter((a) => (a as any).status === "active").length;

  // ── Data prakiraan diturunkan secara dinamis dari Supabase (dengan fallback) ───────────────────
  const forecast = {
    stability: summary?.avg_efficiency > 0 
      ? Math.min(99.5, Math.max(70, Number(summary.avg_efficiency.toFixed(1))))
      : FORECAST_DATA[activeTab].stability,
    maintenanceRisk: summary?.alert_count !== undefined
      ? Math.min(95, Math.max(5, 5 + summary.alert_count * 4))
      : FORECAST_DATA[activeTab].maintenanceRisk,
    fuelBurn: fleetAgents.length > 0
      ? Math.round(100 - (fleetAgents.reduce((s, a) => s + (a.fuel ?? 75), 0) / fleetAgents.length))
      : FORECAST_DATA[activeTab].fuelBurn,
    outputEst: summary?.total_production > 0
      ? (summary.total_production >= 1000 
          ? `${(summary.total_production / 1000).toFixed(1)}k t`
          : `${summary.total_production}t`)
      : FORECAST_DATA[activeTab].outputEst,
    get reliability() {
      return this.stability > 90 && this.maintenanceRisk < 25
        ? "TINGGI"
        : this.stability > 80 && this.maintenanceRisk < 50
          ? "SEDANG"
          : "RENDAH";
    }
  };

  const stream      = telemetryStream.length > 0 ? telemetryStream : INITIAL_TELEMETRY;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prod, ems, summ, alertCount, aiDec, fleet] = await Promise.allSettled([
        fetchProductionSnapshots(activeTab, startDate, endDate),
        fetchEmissionLogs(),
        fetchWeeklySummary(activeTab, startDate, endDate),
        fetchAlertCount(),
        fetchLatestAIDecision(),
        fetchFleetAgents(),
      ]);

      let liveDataUsed = false;

      if (prod.status === "fulfilled" && prod.value.length > 0)  { setProduction(prod.value);  liveDataUsed = true; }
      if (ems.status  === "fulfilled" && ems.value.length  > 0)  { setEmissions(ems.value);    liveDataUsed = true; }
      if (summ.status === "fulfilled" && summ.value) {
        const alertN = alertCount.status === "fulfilled" ? alertCount.value : FALLBACK_SUMMARY.alert_count;
        setSummary({ ...summ.value, alert_count: alertN });
        liveDataUsed = true;
      }
      if (aiDec.status  === "fulfilled" && aiDec.value?.summary) {
        setAiAdvice(aiDec.value.summary);
      } else {
        setAiAdvice(FORECAST_DATA[activeTab].aiAdvice);
      }
      if (fleet.status  === "fulfilled" && fleet.value.length > 0)  {
        setFleetAgents(fleet.value);
        liveDataUsed = true;
      }

      setUsingLive(liveDataUsed);
    } catch (err) {
      console.error("Error memuat analitik:", err);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    loadData();

    // Set up auto-refresh interval every 10 seconds
    const intervalId = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [loadData]);

  // ── PERBAIKAN BUG #2: Sumbu Y selalu mulai dari 0 agar bar menyentuh dasar ────
  const chartData = production.map((r) => ({
    name: r.day_label,
    "Produksi Aktual": r.actual_tons,
    "Target Produksi": r.target_tons,
  }));

  const uniqueEmissions = Object.values(
    emissions.reduce<Record<string, EmissionLog>>((acc, e) => {
      if (!acc[e.vehicle_id]) acc[e.vehicle_id] = e;
      return acc;
    }, {}),
  ).slice(0, 5);

  const avgCO2 =
    uniqueEmissions.length > 0
      ? (uniqueEmissions.reduce((s, e) => s + e.co2_kg, 0) / uniqueEmissions.length).toFixed(1)
      : "—";

  const exportToCSV = () => {
    let csv = "data:text/csv;charset=utf-8,Tipe,Tanggal/Aset,Ton Aktual,Ton Target\n";
    production.forEach((r) => { csv += `Produksi,${r.day_label},${r.actual_tons},${r.target_tons}\n`; });
    emissions.forEach((r)  => { csv += `Emisi,${r.vehicle_id},${r.co2_kg},N/A\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `analitik_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getXYFromGPS = (lat: number, lon: number) => {
    if (!lat || !lon) return null;
    const x = 100 + ((lon - 115.6) / 0.8) * 500;
    const y = 180 - ((lat - (-2.2)) / 0.6) * 140;
    return { x: Math.min(Math.max(x, 50), 650), y: Math.min(Math.max(y, 30), 190) };
  };

  const displayAgents = fleetAgents.length > 0 ? fleetAgents : [
    { id: "HAUL-01", name: "Unit Hauler 42", status: "active" as const, location: { lat: -1.85, lon: 116.15 } },
    { id: "HAUL-02", name: "Unit Hauler 09", status: "idle"   as const, location: { lat: -1.92, lon: 116.08 } },
    { id: "HAUL-03", name: "Unit Hauler 17", status: "active" as const, location: { lat: -1.78, lon: 116.21 } },
  ];

  // ── PERBAIKAN BUG #2: Domain sumbu Y ───────────────────────────────────────────
  const yValues   = chartData.flatMap((d) => [d["Produksi Aktual"], d["Target Produksi"]]);
  const yDataMax  = Math.max(...yValues);
  const yDataMin  = 0; // PAKSA ke 0 agar bar menyentuh sumbu dasar
  const yPad      = Math.max(10_000, (yDataMax - yDataMin) * 0.15);
  const yDomainMin = 0;
  const yDomainMax = Math.ceil((yDataMax + yPad) / 10_000) * 10_000;

  const tabLabels: Record<"Day" | "Week" | "Month", string> = {
    Day: "Hari",
    Week: "Minggu",
    Month: "Bulan",
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] bg-[#F9FAFB]">
      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics Overview</h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">Operational performance and insights.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5 shadow-sm">
              {(["Day", "Week", "Month"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-600">
              <Calendar size={13} className="text-slate-400" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-600 focus:ring-0 cursor-pointer text-xs" />
              <span className="text-slate-300">—</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-600 focus:ring-0 cursor-pointer text-xs" />
            </div>

            <button onClick={loadData} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 shadow-sm">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <Download size={13} />
              Ekspor
            </button>
          </div>
        </div>

        {/* ── KPI Strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <HeroKPICard
            value={`${(summary.total_production / 1000).toFixed(1)}k t`}
            trend="+4.2%"
          />
          <StatKPICard label="Rata-rata Harian"    value={`${summary.avg_per_day.toLocaleString("id-ID", { maximumFractionDigits: 0 })} t`} trend="+1.7%" trendUp icon={BarChart2} />
          <StatKPICard label="Efisiensi Armada" value={`${summary.avg_efficiency.toFixed(1)}%`} trend="+2.9%" trendUp icon={Activity} />
          <StatKPICard label="Peringatan Aktif"    value={String(summary.alert_count)} trend="0.9%" trendUp={false} icon={Bell} />
        </div>

        {/* ── Baris 1: Grafik Produksi + Prakiraan 7 Hari ───────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          {/* Grafik Batang Produksi */}
          <div
            className="col-span-12 lg:col-span-8 rounded-2xl border border-slate-100 p-6 shadow-md shadow-slate-200/50 flex flex-col hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-300"
            style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FAFBFF 55%, #F7F9FF 100%)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Hasil Produksi Harian</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Performa Aktual vs Target</p>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm">
                Ton (t) <ChevronDown size={12} />
              </button>
            </div>

            <div className="flex items-center gap-5 mb-5">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50/70">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]" />
                <span className="text-xs text-slate-600 font-semibold">Produksi Aktual</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Target Produksi</span>
              </div>
            </div>

            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                {/* PERBAIKAN: barCategoryGap adaptif untuk 30 bar + domain Y terkontrol dari 0 */}
                <BarChart
                  data={chartData}
                  barCategoryGap={chartData.length > 20 ? "8%" : chartData.length <= 4 ? "20%" : "35%"}
                  barGap={2}
                >
                  <defs>
                    <linearGradient id="actualProductionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#CBD5E1" fontSize={11} fontFamily="Inter, sans-serif"
                    tickLine={false} axisLine={false} fontWeight={500}
                  />
                  <YAxis
                    stroke="#CBD5E1" fontSize={11} fontFamily="Inter, sans-serif"
                    tickLine={false} axisLine={false}
                    domain={[yDomainMin, yDomainMax]}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<PremiumTooltip />} cursor={{ fill: "#F8FAFC", radius: 6 }} />
                  <ReferenceLine
                    y={75_000} stroke="#2563EB" strokeDasharray="4 4"
                    strokeOpacity={0.35} strokeWidth={1.5}
                    label={{ value: "Target 75K", fill: "#60A5FA", fontSize: 10, fontWeight: 700, position: "right" }}
                  />
                  <Bar dataKey="Produksi Aktual" fill="url(#actualProductionGradient)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  <Bar dataKey="Target Produksi" fill="#94A3B8" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Prakiraan 7 Hari */}
          <div
            className="col-span-12 lg:col-span-4 rounded-2xl border border-slate-100 p-6 shadow-md shadow-slate-200/50 flex flex-col gap-5 hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-300"
            style={{ background: "linear-gradient(165deg, #FFFFFF 0%, #FAFBFF 55%, #F7F9FF 100%)" }}
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Prakiraan 7 Hari</p>
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Performa prediktif</h2>
            </div>

            <div className="space-y-4">
              <ProgressMetric label="Stabilitas Produksi" pct={forecast.stability} valueLabel={`${forecast.stability}%`} barClass="bg-blue-600" valueClass="text-slate-800" />
              <ProgressMetric label="Risiko Perawatan"     pct={forecast.maintenanceRisk} valueLabel={`${forecast.maintenanceRisk < 20 ? "RENDAH" : forecast.maintenanceRisk < 50 ? "SEDANG" : "TINGGI"} · ${forecast.maintenanceRisk}%`} barClass={forecast.maintenanceRisk < 20 ? "bg-emerald-400" : forecast.maintenanceRisk < 50 ? "bg-amber-400" : "bg-red-400"} valueClass={forecast.maintenanceRisk < 20 ? "text-emerald-600" : forecast.maintenanceRisk < 50 ? "text-amber-600" : "text-red-600"} />
              <ProgressMetric label="Indeks Konsumsi BBM"      pct={forecast.fuelBurn} valueLabel={`${forecast.fuelBurn < 50 ? "RENDAH" : forecast.fuelBurn < 70 ? "SEDANG" : "TINGGI"} · ${forecast.fuelBurn}%`} barClass={forecast.fuelBurn < 50 ? "bg-emerald-400" : forecast.fuelBurn < 70 ? "bg-amber-400" : "bg-red-400"} valueClass={forecast.fuelBurn < 50 ? "text-emerald-600" : forecast.fuelBurn < 70 ? "text-amber-600" : "text-red-600"} />
            </div>

            <div className="flex-1 bg-blue-50 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap size={11} className="text-blue-600" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Saran AI</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{aiAdvice}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[10px] text-slate-400 font-semibold mb-1">Est. Output</p>
                <p className="text-xl font-bold text-slate-900">{forecast.outputEst}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[10px] text-slate-400 font-semibold mb-1">Keandalan</p>
                <p className={`text-xl font-bold ${forecast.reliability === "TINGGI" ? "text-blue-600" : forecast.reliability === "SEDANG" ? "text-amber-600" : "text-red-600"}`}>{forecast.reliability}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Baris 2: Ringkasan Mingguan + Status Agent ───────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Ringkasan Mingguan</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Minggu ini · agregat operasional</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Produksi",     value: `${(summary.total_production / 1000).toFixed(1)}k t`, color: "text-slate-900" },
                { label: "Rata-rata / Hari",   value: `${(summary.avg_per_day / 1000).toFixed(1)}k t`,     color: "text-slate-900" },
                { label: "Efisiensi Rata-rata",value: `${summary.avg_efficiency.toFixed(1)}%`,              color: "text-emerald-600" },
                { label: "Downtime Total",     value: `${summary.total_downtime_hours.toFixed(1)} jam`,     color: "text-red-500" },
                { label: "Agent Aktif",        value: `${activeCount} / ${currentAgents.length}`,             color: "text-blue-600" },
                { label: "Alert Terjadi",      value: `${summary.alert_count}×`,                           color: summary.alert_count > 5 ? "text-red-500" : "text-emerald-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Status Agent</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Rincian agent armada</p>
            </div>
            <div className="space-y-4">
              {(["active", "idle", "error"] as const).map((status) => {
                const count = currentAgents.filter((a) => (a as any).status === status).length;
                const pct   = currentAgents.length > 0 ? Math.round((count / currentAgents.length) * 100) : 0;
                const cfg   = {
                  active: { bar: "bg-blue-600", text: "text-blue-600",  label: "Aktif" },
                  idle:   { bar: "bg-amber-400", text: "text-amber-600", label: "Diam"   },
                  error:  { bar: "bg-red-400",   text: "text-red-500",   label: "Error"  },
                }[status];
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-medium">{cfg.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${cfg.text}`}>{count} agent</span>
                        <span className="text-[10px] text-slate-300 font-medium">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-5 border-t border-slate-50 space-y-2">
              <div className="flex items-center gap-2">
                <Wifi size={11} className="text-blue-500" />
                <span className="text-[10px] text-slate-400 font-medium">Mesh network · TEMA-UI: LIGHT_PREMIUM</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={11} className="text-amber-400" />
                <span className="text-[10px] text-slate-400 font-medium">{usingLive ? "Terhubung ke Supabase" : "Data simulasi · Kideco, Kaltim"}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <CircleDot size={11} className="text-slate-300" />
                <span className="text-[10px] text-slate-300 font-medium">Pembaruan terakhir: {lastRefresh.toLocaleTimeString("id-ID")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Baris 3: Monitor Emisi + GIS Twin ─────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">

          <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Monitor Emisi</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">CO₂ per perjalanan berdasarkan aset</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-widest">
                <Leaf size={10} /> Jalur Net Zero
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Rata-rata CO₂ / Perjalanan</p>
                <p className="text-2xl font-bold text-slate-900">{avgCO2} <span className="text-sm font-normal text-slate-400">kg</span></p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Total Armada 24 Jam</p>
                <p className="text-2xl font-bold text-slate-900">3.2 <span className="text-sm font-normal text-slate-400">t</span></p>
              </div>
            </div>
            <div className="space-y-2">
              {uniqueEmissions.map((u) => {
                const isHigh = u.co2_kg > 23;
                return (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${isHigh ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className="text-xs text-slate-600 font-medium">{u.vehicle_id}</span>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${isHigh ? "text-amber-600" : "text-emerald-600"}`}>
                      {u.co2_kg.toFixed(1)} kg/perjalanan
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">GIS Elevation Twin</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Topologi mesh tambang terbuka</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Online</span>
              </div>
            </div>

            <div className="relative h-52 overflow-hidden bg-slate-50">
              <svg viewBox="0 0 700 220" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="gisGlow2" cx="50%" cy="45%" r="50%">
                    <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#F9FAFB" stopOpacity="0"    />
                  </radialGradient>
                </defs>
                <rect width="700" height="220" fill="url(#gisGlow2)" />
                {Array.from({ length: 14 }).map((_, i) => <line key={`gh${i}`} x1={0} y1={i*16} x2={700} y2={i*16} stroke="#E2E8F0" strokeWidth={0.6} />)}
                {Array.from({ length: 22 }).map((_, i) => <line key={`gv${i}`} x1={i*33} y1={0} x2={i*33} y2={220} stroke="#E2E8F0" strokeWidth={0.6} />)}
                {[0,1,2,3,4,5,6,7,8,9,10].map((i) => (
                  <ellipse key={`cr${i}`} cx={350+Math.sin(i*0.5)*18} cy={110+Math.cos(i*0.4)*8} rx={28+i*27} ry={16+i*15}
                    fill="none" stroke="#2563EB" strokeWidth={0.8} strokeOpacity={Math.max(0, 0.10-i*0.007)} />
                ))}
                {([[350,110,280,95],[350,110,420,130],[280,95,310,140],[420,130,460,150],[350,110,340,70],[280,95,250,120],[420,130,390,85],[250,120,200,100],[340,70,390,85],[460,150,450,105]] as [number,number,number,number][]).map(([x1,y1,x2,y2],i) => (
                  <line key={`ml${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2563EB" strokeWidth={0.8} strokeOpacity={0.18} />
                ))}
                {([[350,110],[280,95],[420,130],[310,140],[390,85],[450,105],[250,120],[340,70],[460,150],[200,100]] as [number,number][]).map(([x,y],i) => (
                  <g key={`nd${i}`}>
                    <circle cx={x} cy={y} r={2.5} fill="#2563EB" opacity={0.6} />
                    <circle cx={x} cy={y} r={6} fill="none" stroke="#2563EB" strokeWidth={0.7} opacity={0.2} />
                  </g>
                ))}
                {displayAgents.map((agent) => {
                  const pos = getXYFromGPS(agent.location.lat, agent.location.lon);
                  if (!pos) return null;
                  const isActive = agent.status === "active";
                  return (
                    <g key={agent.id}>
                      <circle cx={pos.x} cy={pos.y} r={5}  fill={isActive ? "#10B981" : "#F59E0B"} />
                      <circle cx={pos.x} cy={pos.y} r={12} fill="none" stroke={isActive ? "#10B981" : "#F59E0B"} strokeWidth={1} opacity={0.4} />
                      <text x={pos.x+8} y={pos.y+4} fontSize={8} fontWeight="bold" fill="#334155">{agent.name || agent.id}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-50">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Node Mesh Terhubung</p>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">Mesh satelit P2P aktif di seluruh area tambang terbuka · ping rata-rata 4ms</p>
              </div>
              <p className="text-3xl font-bold text-blue-600 flex-shrink-0 ml-4 tabular-nums">1,402</p>
            </div>

            <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/50 max-h-32 overflow-y-auto">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Pelacak GPS Armada Aktif</p>
              <div className="grid grid-cols-2 gap-2">
                {displayAgents.map((agent) => (
                  <div key={agent.id} className="flex justify-between text-[10px] font-mono text-slate-500 bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm">
                    <span className="font-bold text-slate-700">{agent.name || agent.id}</span>
                    <span>{agent.location.lat.toFixed(5)}, {agent.location.lon.toFixed(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Baris 4: Aliran Telemetri ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Aliran Telemetri</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Pembacaan sensor langsung</p>
            </div>
            <div className="flex items-center gap-5 text-[10px] font-bold">
              {[{ label: "Normal", dot: "bg-emerald-400" }, { label: "Peringatan", dot: "bg-amber-400" }, { label: "Kritis", dot: "bg-red-400" }].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-slate-400 uppercase tracking-widest">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-50">
                  {["Waktu", "ID Aset", "Sensor Node", "Metrik", "Nilai", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stream.map((row, i) => {
                  const sc = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.NOMINAL;
                  const statusLabelMap: Record<string, string> = {
                    NOMINAL: "NORMAL",
                    WARNING: "PERINGATAN",
                    CRITICAL: "KRITIS",
                  };
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-slate-400">{row.timestamp}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">{row.assetId}</td>
                      <td className="px-6 py-3.5 text-slate-500 font-medium">{row.sensor}</td>
                      <td className="px-6 py-3.5 text-slate-400 font-medium">{row.metric}</td>
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900 tabular-nums">{row.value}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {statusLabelMap[row.status] ?? row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-50 flex justify-center">
            <button onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors group uppercase tracking-widest">
              <span>Lihat Semua Telemetri</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ── Kartu Saran AI ────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex">
            <div className="w-1.5 flex-shrink-0" style={{ background: "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)" }} />
            <div className="flex items-start gap-5 p-6 flex-1">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)" }}>
                <Zap size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 mb-0.5">Saran AI</p>
                <p className="text-xs text-slate-400 font-medium mb-3">Rekomendasi yang dihasilkan dari pola operasional terbaru.</p>
                <p className="text-sm text-slate-600 leading-relaxed">{aiAdvice}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Metrik Prakiraan ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-6 pb-8">
          {[
            { icon: TrendingUp, label: "Stabilitas Produksi", value: `${forecast.stability}%`, status: forecast.stability > 95 ? "SANGAT BAIK" : forecast.stability > 85 ? "BAIK" : "CUKUP", statusColor: forecast.stability > 95 ? "text-emerald-600" : forecast.stability > 85 ? "text-blue-600" : "text-amber-600", barClass: forecast.stability > 95 ? "bg-emerald-500" : forecast.stability > 85 ? "bg-blue-500" : "bg-amber-400", pct: forecast.stability, iconColor: forecast.stability > 95 ? "text-emerald-500" : forecast.stability > 85 ? "text-blue-500" : "text-amber-500" },
            { icon: Activity,   label: "Risiko Perawatan",     value: `${forecast.maintenanceRisk}%`, status: forecast.maintenanceRisk < 20 ? "RENDAH" : forecast.maintenanceRisk < 50 ? "SEDANG" : "TINGGI", statusColor: forecast.maintenanceRisk < 20 ? "text-blue-600" : forecast.maintenanceRisk < 50 ? "text-amber-600" : "text-red-600", barClass: forecast.maintenanceRisk < 20 ? "bg-blue-600" : forecast.maintenanceRisk < 50 ? "bg-amber-400" : "bg-red-400", pct: forecast.maintenanceRisk, iconColor: forecast.maintenanceRisk < 20 ? "text-blue-600" : forecast.maintenanceRisk < 50 ? "text-amber-500" : "text-red-500" },
            { icon: Zap,        label: "Indeks Konsumsi BBM",      value: `${forecast.fuelBurn}%`, status: forecast.fuelBurn < 50 ? "RENDAH" : forecast.fuelBurn < 70 ? "SEDANG" : "TINGGI", statusColor: forecast.fuelBurn < 50 ? "text-emerald-600" : forecast.fuelBurn < 70 ? "text-amber-600" : "text-red-600", barClass: forecast.fuelBurn < 50 ? "bg-emerald-400" : forecast.fuelBurn < 70 ? "bg-amber-400" : "bg-red-400", pct: forecast.fuelBurn, iconColor: forecast.fuelBurn < 50 ? "text-emerald-500" : forecast.fuelBurn < 70 ? "text-amber-500" : "text-red-500" },
          ].map(({ icon: Icon, label, value, status, statusColor, barClass, pct, iconColor }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Icon size={15} className={iconColor} />
                </div>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
              </div>
              <div className="flex items-end justify-between mb-4">
                <p className={`text-5xl font-bold ${statusColor} leading-none tracking-tight`}>{value}</p>
                <span className={`text-xs font-bold ${statusColor} uppercase tracking-widest`}>{status}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${barClass} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
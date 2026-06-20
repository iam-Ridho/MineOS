"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchReclamationZones, fetchReports, generateLLMReport, saveReport, type ReclamationZoneRow, type ReportRow } from "@/lib/api";
import {
  FileText, Truck, ShieldAlert, Wind, Leaf,
  AlertTriangle, Info, ChevronRight, Clock,
  CalendarDays, RefreshCw, CheckCircle2, Eye,
  TrendingUp, TrendingDown, Minus, Loader2,
  AlertCircle, BarChart3, MapPin, Fuel, Zap,
  Download,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Shift = "Pagi" | "Siang" | "Malam";
type AlertPriority = "CRITICAL" | "WARNING" | "INFO";
type ReportStatus = "idle" | "loading" | "done" | "error";

interface FleetData {
  totalArmada: number;
  gpsOnline: number;
  gpsOffline: number;
  avgFuelConsumption: number;
  rekomendasiRute: string;
  penghematanFuel: string;
  kendaraanBermasalah: string[];
}

interface SafetyData {
  alertCritical: number;
  alertWarning: number;
  alertInfo: number;
  incidents: { kendaraan: string; jenis: string; zona: string; severity: AlertPriority }[];
  cuacaStatus: string;
}

interface EmissionData {
  targetBulan: number;
  actualBulan: number;
  persentase: number;
  trendMingguIni: number;
  co2PerTrip: number;
  totalTrip: number;
}

interface ReclamationData {
  zones: { area: string; completion: number; vegetasiIndex: number; status: string }[];
}

interface AlertItem {
  priority: AlertPriority;
  message: string;
  action: string;
  waktu: string;
}

interface HistoryItem {
  id: string;
  tanggal: string;
  shift: Shift;
  status: "selesai" | "gagal";
  summary: string;
}

interface ReportData {
  generatedAt: string;
  tanggal: string;
  shift: Shift;
  executiveSummary: string;
  fleet: FleetData;
  safety: SafetyData;
  emission: EmissionData;
  reclamation: ReclamationData;
  alerts: AlertItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// Ganti bagian ini dengan API call sungguhan: POST /api/llm/report
// ─────────────────────────────────────────────────────────────────────────────

const generateMockReport = (tanggal: string, shift: Shift): ReportData => ({
  generatedAt: new Date().toLocaleString("id-ID"),
  tanggal,
  shift,
  executiveSummary:
    "Fleet B-3 disarankan reroute karena kombinasi: cuaca hujan + lereng 78% threshold + 2 operator fatigue score tinggi. Laporan keselamatan menunjukkan 3 alert proximity di zona risiko tinggi yang memerlukan penanganan segera. Emisi CO₂ fleet mencapai 120% target bulan ini, diperlukan optimasi rute untuk trip selanjutnya guna mematuhi regulasi Perpres 110/2025. Status reklamasi area A1 mencapai 85% completion, sementara area B1 masih tertinggal di angka 45% dan memerlukan percepatan.",
  fleet: {
    totalArmada: 12,
    gpsOnline: 11,
    gpsOffline: 1,
    avgFuelConsumption: 8.5,
    rekomendasiRute: "Rute B3 via jalan alternatif lebih hemat 15% fuel",
    penghematanFuel: "15%",
    kendaraanBermasalah: ["Fleet B-3 (rute berisiko)", "Hauler X1 (fuel rendah 18%)"],
  },
  safety: {
    alertCritical: 1,
    alertWarning: 2,
    alertInfo: 4,
    incidents: [
      { kendaraan: "Fleet B-3", jenis: "Proximity Zone", zona: "Zona Risiko A", severity: "CRITICAL" },
      { kendaraan: "Hauler X2", jenis: "Speed Violation", zona: "Zona B", severity: "WARNING" },
      { kendaraan: "Excavator Beta", jenis: "Zone Entry", zona: "Zona Restriksi C", severity: "WARNING" },
    ],
    cuacaStatus: "Hujan Lebat — visibilitas terbatas di Zona A",
  },
  emission: {
    targetBulan: 500,
    actualBulan: 600,
    persentase: 120,
    trendMingguIni: 5,
    co2PerTrip: 2.4,
    totalTrip: 248,
  },
  reclamation: {
    zones: [
      { area: "Area A1", completion: 85, vegetasiIndex: 0.72, status: "On Track" },
      { area: "Area A2", completion: 90, vegetasiIndex: 0.81, status: "Ahead" },
      { area: "Area B1", completion: 45, vegetasiIndex: 0.38, status: "Behind" },
      { area: "Area B2", completion: 62, vegetasiIndex: 0.55, status: "On Track" },
    ],
  },
  alerts: [
    {
      priority: "CRITICAL",
      message: "Kendaraan B-3 memasuki zona risiko tinggi + cuaca ekstrem terdeteksi",
      action: "Segera turunkan speed atau alihkan ke rute alternatif",
      waktu: "08:42",
    },
    {
      priority: "WARNING",
      message: "Emisi fleet sudah mencapai 120% dari target bulan ini",
      action: "Optimalkan rute untuk 5 trip ke depan, prioritaskan kendaraan efisien",
      waktu: "09:15",
    },
    {
      priority: "WARNING",
      message: "Hauler X1 fuel tersisa 18% — di bawah threshold operasional",
      action: "Arahkan ke titik pengisian bahan bakar terdekat sebelum trip berikutnya",
      waktu: "09:31",
    },
    {
      priority: "INFO",
      message: "Reklamasi area A2 mencapai 90% — mendekati target selesai",
      action: "Siapkan tim untuk final inspection dan dokumentasi",
      waktu: "10:05",
    },
    {
      priority: "INFO",
      message: "GPS Fleet unit #7 offline selama 22 menit",
      action: "Cek koneksi modul GPS atau kirim teknisi lapangan",
      waktu: "10:18",
    },
  ],
});

const MOCK_HISTORY: HistoryItem[] = [
  { id: "rpt-001", tanggal: "2026-05-20", shift: "Pagi",  status: "selesai", summary: "Operasi normal, 1 alert critical teratasi." },
  { id: "rpt-002", tanggal: "2026-05-20", shift: "Siang", status: "selesai", summary: "Emisi 118% target, reklamasi A2 progress baik." },
  { id: "rpt-003", tanggal: "2026-05-19", shift: "Malam", status: "selesai", summary: "Cuaca cerah, produksi 103% target harian." },
  { id: "rpt-004", tanggal: "2026-05-19", shift: "Pagi",  status: "selesai", summary: "Fleet B-3 downtime 2 jam, maintenance terjadwal." },
  { id: "rpt-005", tanggal: "2026-05-18", shift: "Siang", status: "gagal",   summary: "AI timeout — laporan tidak tersimpan." },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function getString(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    if (typeof row[key] === "string" && row[key]) return row[key] as string;
    if (typeof row[key] === "number") return String(row[key]);
  }
  return fallback;
}

function getNumber(row: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    if (typeof row[key] === "number") return row[key] as number;
    if (typeof row[key] === "string" && row[key] !== "") {
      const parsed = Number(row[key]);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return fallback;
}

function normalizeShift(value: string): Shift {
  return value === "Siang" || value === "Malam" ? value : "Pagi";
}

function normalizeReportRow(row: ReportRow): HistoryItem {
  const item = row as Record<string, unknown>;
  const createdAt = getString(item, ["timestamp", "created_at"], new Date().toISOString());
  const tanggal = getString(item, ["tanggal", "date", "report_date"], createdAt.split("T")[0]);
  const report = item.report as Partial<ReportData> | undefined;

  return {
    id: getString(item, ["id"], `rpt-${createdAt}`),
    tanggal,
    shift: normalizeShift(getString(item, ["shift"], report?.shift ?? "Pagi")),
    status: getString(item, ["status"], "selesai") === "gagal" ? "gagal" : "selesai",
    summary:
      getString(item, ["summary", "executive_summary", "decision_text"], "") ||
      report?.executiveSummary ||
      "Laporan tersimpan di Supabase.",
  };
}

function normalizeReclamationZone(row: ReclamationZoneRow) {
  const item = row as Record<string, unknown>;
  return {
    area: getString(item, ["area", "name", "zone"], "Area"),
    completion: getNumber(item, ["completion", "progress", "completion_percentage"], 0),
    vegetasiIndex: getNumber(item, ["vegetasiIndex", "vegetasi_index", "vegetation_index"], 0),
    status: getString(item, ["status"], "On Track"),
  };
}

function getObject(row: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = row[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  }
  return null;
}

function getArray(row: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  return [];
}

function normalizePriority(value: string): AlertPriority {
  const upper = value.toUpperCase();
  if (upper === "CRITICAL" || upper === "WARNING") return upper;
  return "INFO";
}

// Label tampilan Bahasa Indonesia untuk kode prioritas alert
function getPriorityLabel(priority: AlertPriority): string {
  if (priority === "CRITICAL") return "KRITIS";
  if (priority === "WARNING") return "PERINGATAN";
  return "INFO";
}

// Label tampilan Bahasa Indonesia untuk status zona reklamasi
function getZoneStatusLabel(status: string): string {
  if (status === "Ahead") return "Lebih Cepat";
  if (status === "Behind") return "Tertinggal";
  return "Sesuai Target";
}

function normalizeLLMReportResponse(response: ReportRow, tanggal: string, shift: Shift): ReportData {
  const root = (getObject(response, ["report", "data", "result"]) ?? response) as Record<string, unknown>;
  const fallback = generateMockReport(tanggal, shift);
  const fleet = getObject(root, ["fleet", "fleetData"]) ?? {};
  const safety = getObject(root, ["safety", "safetyData"]) ?? {};
  const emission = getObject(root, ["emission", "emissionData"]) ?? {};
  const reclamation = getObject(root, ["reclamation", "reclamationData"]) ?? {};

  return {
    generatedAt: getString(root, ["generatedAt", "generated_at", "timestamp"], new Date().toLocaleString("id-ID")),
    tanggal: getString(root, ["tanggal", "date", "report_date"], tanggal),
    shift: normalizeShift(getString(root, ["shift"], shift)),
    executiveSummary:
      getString(root, ["executiveSummary", "executive_summary", "summary", "decision_text"], "") ||
      fallback.executiveSummary,
    fleet: {
      totalArmada: getNumber(fleet, ["totalArmada", "total_armada", "totalFleet"], fallback.fleet.totalArmada),
      gpsOnline: getNumber(fleet, ["gpsOnline", "gps_online"], fallback.fleet.gpsOnline),
      gpsOffline: getNumber(fleet, ["gpsOffline", "gps_offline"], fallback.fleet.gpsOffline),
      avgFuelConsumption: getNumber(fleet, ["avgFuelConsumption", "avg_fuel_consumption"], fallback.fleet.avgFuelConsumption),
      rekomendasiRute: getString(fleet, ["rekomendasiRute", "rekomendasi_rute", "routeRecommendation"], fallback.fleet.rekomendasiRute),
      penghematanFuel: getString(fleet, ["penghematanFuel", "penghematan_fuel", "fuelSaving"], fallback.fleet.penghematanFuel),
      kendaraanBermasalah: getArray(fleet, ["kendaraanBermasalah", "kendaraan_bermasalah", "problemVehicles"])
        .map((item) => getString(item, ["name", "vehicle_id", "kendaraan", "message"]))
        .filter(Boolean),
    },
    safety: {
      alertCritical: getNumber(safety, ["alertCritical", "alert_critical", "critical"], fallback.safety.alertCritical),
      alertWarning: getNumber(safety, ["alertWarning", "alert_warning", "warning"], fallback.safety.alertWarning),
      alertInfo: getNumber(safety, ["alertInfo", "alert_info", "info"], fallback.safety.alertInfo),
      incidents: getArray(safety, ["incidents", "alerts"]).map((item) => ({
        kendaraan: getString(item, ["kendaraan", "vehicle_id", "vehicle"], "-"),
        jenis: getString(item, ["jenis", "alert_type", "type"], "Peringatan"),
        zona: getString(item, ["zona", "zone"], "-"),
        severity: normalizePriority(getString(item, ["severity", "priority"], "INFO")),
      })),
      cuacaStatus: getString(safety, ["cuacaStatus", "cuaca_status", "weather"], fallback.safety.cuacaStatus),
    },
    emission: {
      targetBulan: getNumber(emission, ["targetBulan", "target_bulan", "target"], fallback.emission.targetBulan),
      actualBulan: getNumber(emission, ["actualBulan", "actual_bulan", "actual"], fallback.emission.actualBulan),
      persentase: getNumber(emission, ["persentase", "percentage"], fallback.emission.persentase),
      trendMingguIni: getNumber(emission, ["trendMingguIni", "trend_minggu_ini", "trend"], fallback.emission.trendMingguIni),
      co2PerTrip: getNumber(emission, ["co2PerTrip", "co2_per_trip"], fallback.emission.co2PerTrip),
      totalTrip: getNumber(emission, ["totalTrip", "total_trip"], fallback.emission.totalTrip),
    },
    reclamation: {
      zones: getArray(reclamation, ["zones", "areas"]).map(normalizeReclamationZone),
    },
    alerts: getArray(root, ["alerts", "recommendations", "anomali"]).map((item) => ({
      priority: normalizePriority(getString(item, ["priority", "severity"], "INFO")),
      message: getString(item, ["message", "summary", "description"], "Peringatan terdeteksi oleh AI."),
      action: getString(item, ["action", "recommendation", "rekomendasi"], "Tinjau kondisi operasional terkait."),
      waktu: getString(item, ["waktu", "time", "created_at"], new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Membungkus & meng-escape satu nilai field CSV (menangani koma, kutip, baris baru)
function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Menyusun satu baris CSV dari array nilai
function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(",") + "\r\n";
}

// Memicu unduhan file teks lewat Blob (lebih aman & tidak terbatas ukuran dibanding data: URI)
function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center">
        <Icon size={13} className="text-blue-600" />
      </div>
      <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-widest">{label}</span>
    </div>
  );
}

function StatCard({
  label, value, sub, color = "text-slate-900",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function AlertBadge({ priority }: { priority: AlertPriority }) {
  const map = {
    CRITICAL: "text-red-600 bg-red-50 border-red-100",
    WARNING:  "text-sky-700 bg-sky-50 border-sky-200",
    INFO:     "text-blue-600 bg-blue-50 border-blue-100",
  };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${map[priority]}`}>
      {getPriorityLabel(priority)}
    </span>
  );
}

function AlertIcon({ priority }: { priority: AlertPriority }) {
  if (priority === "CRITICAL") return <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />;
  if (priority === "WARNING")  return <AlertTriangle size={15} className="text-sky-500 shrink-0 mt-0.5" />;
  return <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CARDS
// ─────────────────────────────────────────────────────────────────────────────

function FleetCard({ data }: { data: FleetData }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
          <Truck size={15} className="text-blue-600" />
        </div>
        <div>
          <p className="text-slate-900 text-sm font-bold">Laporan Armada</p>
          <p className="text-slate-500 text-xs font-mono">Agen Armada</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard label="Total Armada" value={data.totalArmada} sub="kendaraan aktif" />
        <StatCard label="GPS Online" value={`${data.gpsOnline}/${data.totalArmada}`}
          sub={`${data.gpsOffline} offline`}
          color={data.gpsOffline > 0 ? "text-sky-600" : "text-emerald-500"} />
        <StatCard label="Rata-rata BBM" value={`${data.avgFuelConsumption}L`} sub="per 100km" />
        <StatCard label="Penghematan" value={data.penghematanFuel} sub="via rute alternatif" color="text-emerald-500" />
      </div>

      <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-3 mb-3">
        <p className="text-xs text-blue-700 font-mono font-bold mb-1 flex items-center gap-1.5">
          <MapPin size={10} /> Rekomendasi Rute
        </p>
        <p className="text-xs text-slate-600">{data.rekomendasiRute}</p>
      </div>

      {data.kendaraanBermasalah.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Kendaraan perlu perhatian:</p>
          <div className="space-y-1">
            {data.kendaraanBermasalah.map((k, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                {k}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SafetyCard({ data }: { data: SafetyData }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
          <ShieldAlert size={15} className="text-red-500" />
        </div>
        <div>
          <p className="text-slate-900 text-sm font-bold">Laporan Keselamatan</p>
          <p className="text-slate-500 text-xs font-mono">Agen Keselamatan</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Kritis" value={data.alertCritical} color="text-red-500" />
        <StatCard label="Peringatan" value={data.alertWarning} color="text-sky-600" />
        <StatCard label="Info" value={data.alertInfo} color="text-blue-500" />
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-3">
        <p className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <Wind size={10} /> Kondisi Cuaca
        </p>
        <p className="text-xs text-blue-700 font-semibold">{data.cuacaStatus}</p>
      </div>

      <div className="space-y-2">
        {data.incidents.map((inc, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 flex items-start gap-2 border
            ${inc.severity === "CRITICAL" ? "bg-red-50/60 border-red-100" :
              inc.severity === "WARNING"  ? "bg-sky-50/60 border-sky-200" :
              "bg-blue-50/60 border-blue-100"}
          `}>
            <AlertBadge priority={inc.severity} />
            <div className="min-w-0">
              <p className="text-xs text-slate-900 font-semibold">{inc.kendaraan}</p>
              <p className="text-xs text-slate-500">{inc.jenis} · {inc.zona}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmissionCard({ data }: { data: EmissionData }) {
  const over = data.persentase > 100;
  const barColor = data.persentase > 110 ? "bg-red-500" : data.persentase > 100 ? "bg-sky-500" : "bg-emerald-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Wind size={15} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-slate-900 text-sm font-bold">Laporan Emisi</p>
          <p className="text-slate-500 text-xs font-mono">Agen Emisi</p>
        </div>
      </div>

      {/* CO2 gauge */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-widest">Emisi CO₂ Bulan Ini</p>
            <p className={`text-2xl font-bold font-mono mt-0.5 ${over ? "text-red-500" : "text-emerald-500"}`}>
              {data.actualBulan} <span className="text-sm font-normal text-slate-500">ton</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500 font-mono font-bold uppercase tracking-widest">Target</p>
            <p className="text-sm font-mono text-slate-600">{data.targetBulan} ton</p>
          </div>
        </div>
        <ProgressBar value={data.persentase} color={barColor} />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-500 font-mono">0%</span>
          <span className={`text-xs font-mono font-bold ${over ? "text-red-500" : "text-emerald-500"}`}>
            {data.persentase}% dari target
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="CO₂/Perjalanan" value={`${data.co2PerTrip}t`} sub="rata-rata" />
        <StatCard label="Total Perjalanan" value={data.totalTrip} sub="hari ini" />
        <StatCard
          label="Tren"
          value={`+${data.trendMingguIni}%`}
          sub="vs minggu lalu"
          color="text-red-500"
        />
      </div>
    </div>
  );
}

function ReclamationCard({ data }: { data: ReclamationData }) {
  const getStatusColor = (s: string) =>
    s === "Ahead" ? "text-emerald-600" : s === "Behind" ? "text-red-600" : "text-sky-600";
  const getBarColor = (c: number) =>
    c >= 85 ? "bg-emerald-500" : c >= 60 ? "bg-sky-500" : "bg-red-500";

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
          <Leaf size={15} className="text-green-500" />
        </div>
        <div>
          <p className="text-slate-900 text-sm font-bold">Laporan Reklamasi</p>
          <p className="text-slate-500 text-xs font-mono">Agen Reklamasi</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.zones.map((zone, i) => (
          <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-900 font-semibold">{zone.area}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold ${getStatusColor(zone.status)}`}>
                  {getZoneStatusLabel(zone.status)}
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">{zone.completion}%</span>
              </div>
            </div>
            <ProgressBar value={zone.completion} color={getBarColor(zone.completion)} />
            <p className="text-xs text-slate-500 mt-1.5 font-mono">
              Indeks Vegetasi: {zone.vegetasiIndex.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LLMReportPage() {
  const today = new Date().toISOString().split("T")[0];

  const [tanggal, setTanggal]     = useState(today);
  const [shift, setShift]         = useState<Shift>("Pagi");
  const [status, setStatus]       = useState<ReportStatus>("idle");
  const [report, setReport]       = useState<ReportData | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory]     = useState<HistoryItem[]>(MOCK_HISTORY);
  const [viewReport, setViewReport] = useState<HistoryItem | null>(null);
  const [reclamationZones, setReclamationZones] = useState<ReclamationData["zones"]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      const [reportsData, zonesData] = await Promise.all([fetchReports(), fetchReclamationZones()]);
      if (!mounted) return;
      if (reportsData.length > 0) setHistory(reportsData.map(normalizeReportRow));
      if (zonesData.length > 0) setReclamationZones(zonesData.map(normalizeReclamationZone));
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  // Memuat ulang riwayat laporan & data zona reklamasi terbaru dari Supabase
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [reportsData, zonesData] = await Promise.all([fetchReports(), fetchReclamationZones()]);
      if (reportsData.length > 0) setHistory(reportsData.map(normalizeReportRow));
      if (zonesData.length > 0) setReclamationZones(zonesData.map(normalizeReclamationZone));
    } catch (error) {
      console.error("Gagal menyegarkan data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setStatus("loading");
    setReport(null);
    setErrorMessage("");

    try {
      const response = await generateLLMReport({ scenario: "normal", tanggal, shift });
      const data = normalizeLLMReportResponse(response, tanggal, shift);
      if (reclamationZones.length > 0 && data.reclamation.zones.length === 0) {
        data.reclamation = { zones: reclamationZones };
      }
      setReport(data);
      setStatus("done");

      const newItem: HistoryItem = {
        id: `rpt-${Date.now()}`,
        tanggal,
        shift,
        status: "selesai",
        summary: data.executiveSummary.slice(0, 80) + "...",
      };
      const inserted = await saveReport({
        tanggal,
        shift,
        status: "selesai",
        summary: newItem.summary,
        executive_summary: data.executiveSummary,
        report: data,
      });
      if (inserted) newItem.id = normalizeReportRow(inserted).id;
      setHistory((prev) => [newItem, ...prev]);
    } catch (error) {
      console.error("Failed to generate LLM report:", error);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghubungi backend AI report.");
    }
  }, [tanggal, shift, reclamationZones]);

  // ── Fitur Ekspor: riwayat laporan + (jika ada) detail laporan aktif → satu file CSV ──
  const handleExport = useCallback(() => {
    if (history.length === 0 && !report) return;

    setExporting(true);
    try {
      const rows: string[] = [];

      // Bagian 1: Riwayat Laporan
      rows.push(csvRow(["RIWAYAT LAPORAN"]));
      rows.push(csvRow(["Tanggal", "Shift", "Status", "Ringkasan"]));
      history.forEach((item) => {
        rows.push(csvRow([item.tanggal, item.shift, item.status.toUpperCase(), item.summary]));
      });

      // Bagian 2: Detail laporan yang sedang aktif/ditampilkan (jika sudah dibuat)
      if (report) {
        rows.push(csvRow([]));
        rows.push(csvRow(["DETAIL LAPORAN AKTIF", `${report.tanggal} - Shift ${report.shift}`]));
        rows.push(csvRow(["Ringkasan Eksekutif", report.executiveSummary]));

        rows.push(csvRow([]));
        rows.push(csvRow(["ARMADA"]));
        rows.push(csvRow(["Total Armada", report.fleet.totalArmada]));
        rows.push(csvRow(["GPS Online", report.fleet.gpsOnline]));
        rows.push(csvRow(["GPS Offline", report.fleet.gpsOffline]));
        rows.push(csvRow(["Rata-rata BBM (L/100km)", report.fleet.avgFuelConsumption]));
        rows.push(csvRow(["Rekomendasi Rute", report.fleet.rekomendasiRute]));
        rows.push(csvRow(["Penghematan Fuel", report.fleet.penghematanFuel]));
        rows.push(csvRow(["Kendaraan Bermasalah", report.fleet.kendaraanBermasalah.join("; ") || "-"]));

        rows.push(csvRow([]));
        rows.push(csvRow(["KESELAMATAN"]));
        rows.push(csvRow(["Alert Kritis", report.safety.alertCritical]));
        rows.push(csvRow(["Alert Peringatan", report.safety.alertWarning]));
        rows.push(csvRow(["Alert Info", report.safety.alertInfo]));
        rows.push(csvRow(["Status Cuaca", report.safety.cuacaStatus]));
        if (report.safety.incidents.length > 0) {
          rows.push(csvRow(["Kendaraan", "Jenis Insiden", "Zona", "Tingkat"]));
          report.safety.incidents.forEach((inc) => {
            rows.push(csvRow([inc.kendaraan, inc.jenis, inc.zona, getPriorityLabel(inc.severity)]));
          });
        }

        rows.push(csvRow([]));
        rows.push(csvRow(["EMISI"]));
        rows.push(csvRow(["Target Bulan (ton)", report.emission.targetBulan]));
        rows.push(csvRow(["Aktual Bulan (ton)", report.emission.actualBulan]));
        rows.push(csvRow(["Persentase (%)", report.emission.persentase]));
        rows.push(csvRow(["Tren Minggu Ini (%)", report.emission.trendMingguIni]));
        rows.push(csvRow(["CO2 per Perjalanan (ton)", report.emission.co2PerTrip]));
        rows.push(csvRow(["Total Perjalanan", report.emission.totalTrip]));

        if (report.reclamation.zones.length > 0) {
          rows.push(csvRow([]));
          rows.push(csvRow(["REKLAMASI"]));
          rows.push(csvRow(["Area", "Completion (%)", "Indeks Vegetasi", "Status"]));
          report.reclamation.zones.forEach((zone) => {
            rows.push(csvRow([zone.area, zone.completion, zone.vegetasiIndex, getZoneStatusLabel(zone.status)]));
          });
        }

        if (report.alerts.length > 0) {
          rows.push(csvRow([]));
          rows.push(csvRow(["PERINGATAN & ANOMALI"]));
          rows.push(csvRow(["Prioritas", "Waktu", "Pesan", "Tindakan"]));
          report.alerts.forEach((alert) => {
            rows.push(csvRow([getPriorityLabel(alert.priority), alert.waktu, alert.message, alert.action]));
          });
        }
      }

      // BOM UTF-8 di awal agar Excel membaca karakter (mis. ₂, ·) dengan benar
      const csvContent = "\uFEFF" + rows.join("");
      const dateLabel = (report?.tanggal ?? tanggal).replaceAll("-", "");
      const shiftLabel = (report?.shift ?? shift).toLowerCase();
      downloadTextFile(`laporan-ai_${dateLabel}_${shiftLabel}.csv`, csvContent);
    } catch (error) {
      console.error("Gagal mengekspor laporan:", error);
    } finally {
      setExporting(false);
    }
  }, [history, report, tanggal, shift]);

  const exportDisabled = exporting || (history.length === 0 && !report);

  return (
    <div className="h-full w-full overflow-y-auto font-sans">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-sans text-xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <span className="w-1.5 h-7 bg-cyan-500 rounded-sm"></span>
            Laporan AI
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Laporan analisis AI berbasis data operasional tambang</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exportDisabled}
            title={exportDisabled ? "Belum ada data untuk diekspor" : "Ekspor riwayat & laporan aktif ke CSV"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 text-slate-600 text-sm font-bold shadow-sm shadow-slate-100 transition-colors"
          >
            <Download size={14} className={exporting ? "animate-pulse" : ""} />
            Ekspor
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200 text-slate-600 text-sm font-bold shadow-sm shadow-slate-100 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── SECTION 1 : INPUT ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
          <SectionLabel icon={FileText} label="Buat Laporan BI" />

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Tanggal */}
            <div className="flex-1">
              <label className="text-xs text-slate-500 font-mono font-bold uppercase tracking-widest block mb-1.5">Tanggal</label>
              <div className="relative">
                <CalendarDays size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={tanggal}
                  max={today}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 [color-scheme:light]"
                />
              </div>
            </div>

            {/* Shift */}
            <div className="sm:w-40">
              <label className="text-xs text-slate-500 font-mono font-bold uppercase tracking-widest block mb-1.5">Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as Shift)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              >
                {(["Pagi", "Siang", "Malam"] as Shift[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Button */}
            <div className="sm:self-end">
              <button
                onClick={handleGenerate}
                disabled={status === "loading"}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-sm font-bold shadow-sm shadow-cyan-500/20 transition-colors"
              >
                {status === "loading" ? (
                  <><Loader2 size={14} className="animate-spin" /> Memproses...</>
                ) : (
                  <><RefreshCw size={14} /> Buat Laporan</>
                )}
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {status === "loading" && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
              <Loader2 size={14} className="text-blue-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs text-blue-700 font-bold">AI sedang memproses...</p>
                <p className="text-xs text-slate-500 mt-0.5">AI menganalisis data dari 4 agent. Harap tunggu.</p>
              </div>
            </div>
          )}

          {status === "done" && report && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <p className="text-xs text-emerald-600">
                Laporan berhasil dibuat · {report.generatedAt}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-600 font-bold">Gagal membuat laporan dari backend</p>
                <p className="text-xs text-slate-500 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTIONS 2–4 : REPORT CONTENT ─────────────────────────────── */}
        {(status === "idle" || status === "error") && !report && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 py-16 text-center">
            <BarChart3 size={28} className="text-blue-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Pilih tanggal dan shift, lalu klik <span className="text-blue-600 font-bold">Buat Laporan</span></p>
            <p className="text-slate-400 text-xs mt-1">Laporan akan dibuat oleh AI dalam Bahasa Indonesia</p>
          </div>
        )}

        {report && (
          <>
            {/* ── SECTION 2 : EXECUTIVE SUMMARY ─────────────────────────── */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
              <SectionLabel icon={FileText} label="Ringkasan Eksekutif" />

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={11} className="text-blue-700" />
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{report.executiveSummary}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-slate-500 font-mono">
                  <Clock size={10} className="inline mr-1" />
                  {report.generatedAt}
                </span>
                <span className="text-xs text-slate-300 font-mono">·</span>
                <span className="text-xs text-slate-500 font-mono">
                  Shift {report.shift} · {new Date(report.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* ── SECTION 3 : DOMAIN CARDS ───────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <BarChart3 size={13} className="text-blue-600" />
                </div>
                <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-widest">Laporan Per Domain</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FleetCard      data={report.fleet} />
                <SafetyCard     data={report.safety} />
                <EmissionCard   data={report.emission} />
                <ReclamationCard data={report.reclamation} />
              </div>
            </div>

            {/* ── SECTION 4 : ALERTS ─────────────────────────────────────── */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 p-5">
              <SectionLabel icon={AlertTriangle} label="Peringatan & Anomali yang Terdeteksi AI" />

              <div className="space-y-3">
                {report.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-4 py-3 border flex gap-3 ${
                      alert.priority === "CRITICAL"
                        ? "bg-red-50/60 border-red-100"
                        : alert.priority === "WARNING"
                        ? "bg-sky-50/60 border-sky-200"
                        : "bg-blue-50/60 border-blue-100"
                    }`}
                  >
                    <AlertIcon priority={alert.priority} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <AlertBadge priority={alert.priority} />
                        <span className="text-xs text-slate-500 font-mono">{alert.waktu}</span>
                      </div>
                      <p className="text-sm text-slate-900 mb-1">{alert.message}</p>
                      <div className="flex items-start gap-1.5">
                        <ChevronRight size={11} className="text-slate-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600">{alert.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SECTION 5 : HISTORY ────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Clock size={13} className="text-blue-600" />
              </div>
              <span className="text-xs text-slate-500 font-bold font-mono uppercase tracking-widest">Riwayat Laporan</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">{history.length} laporan</span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {["Tanggal", "Shift", "Status", "Ringkasan", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] text-slate-500 uppercase tracking-widest font-mono font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i === 0 && status === "done" ? "bg-blue-50/50" : ""}`}
                >
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-slate-600">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {i === 0 && status === "done" && (
                      <span className="ml-2 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">Terbaru</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-slate-600 font-mono">{item.shift}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      item.status === "selesai"
                        ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                        : "text-red-600 bg-red-50 border-red-100"
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <p className="text-xs text-slate-500 truncate">{item.summary}</p>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setViewReport(viewReport?.id === item.id ? null : item)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors font-mono"
                    >
                      <Eye size={11} /> Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expanded history detail */}
          {viewReport && (
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-500 font-mono mb-1">Detail laporan · {viewReport.id}</p>
              <p className="text-sm text-slate-700">{viewReport.summary}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
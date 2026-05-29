"use client";

import { useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import {
  FileText, Truck, ShieldAlert, Wind, Leaf,
  AlertTriangle, Info, ChevronRight, Clock,
  CalendarDays, RefreshCw, CheckCircle2, Eye,
  TrendingUp, TrendingDown, Minus, Loader2,
  AlertCircle, BarChart3, MapPin, Fuel, Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Shift = "Pagi" | "Siang" | "Malam";
type AlertPriority = "CRITICAL" | "WARNING" | "INFO";
type ReportStatus = "idle" | "loading" | "done";

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
// Replace this section with real API call: POST /api/llm/report
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
  { id: "rpt-005", tanggal: "2026-05-18", shift: "Siang", status: "gagal",   summary: "LLM timeout — laporan tidak tersimpan." },
];

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} className="text-amber-400" />
      <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">{label}</span>
    </div>
  );
}

function StatCard({
  label, value, sub, color = "text-white",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/8 p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function AlertBadge({ priority }: { priority: AlertPriority }) {
  const map = {
    CRITICAL: "text-red-400 bg-red-500/10 border-red-500/30",
    WARNING:  "text-amber-400 bg-amber-500/10 border-amber-500/30",
    INFO:     "text-blue-400 bg-blue-500/10 border-blue-500/30",
  };
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${map[priority]}`}>
      {priority}
    </span>
  );
}

function AlertIcon({ priority }: { priority: AlertPriority }) {
  if (priority === "CRITICAL") return <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />;
  if (priority === "WARNING")  return <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />;
  return <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CARDS
// ─────────────────────────────────────────────────────────────────────────────

function FleetCard({ data }: { data: FleetData }) {
  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Truck size={15} className="text-amber-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Fleet Report</p>
          <p className="text-gray-600 text-xs font-mono">Fleet Agent</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard label="Total Armada" value={data.totalArmada} sub="kendaraan aktif" />
        <StatCard label="GPS Online" value={`${data.gpsOnline}/${data.totalArmada}`}
          sub={`${data.gpsOffline} offline`}
          color={data.gpsOffline > 0 ? "text-amber-400" : "text-emerald-400"} />
        <StatCard label="Avg Fuel" value={`${data.avgFuelConsumption}L`} sub="per 100km" />
        <StatCard label="Penghematan" value={data.penghematanFuel} sub="via rute alternatif" color="text-emerald-400" />
      </div>

      <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3 mb-3">
        <p className="text-xs text-amber-400 font-mono mb-1 flex items-center gap-1.5">
          <MapPin size={10} /> Rekomendasi Rute
        </p>
        <p className="text-xs text-gray-300">{data.rekomendasiRute}</p>
      </div>

      {data.kendaraanBermasalah.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Kendaraan perlu perhatian:</p>
          <div className="space-y-1">
            {data.kendaraanBermasalah.map((k, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
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
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldAlert size={15} className="text-red-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Safety Report</p>
          <p className="text-gray-600 text-xs font-mono">Safety Agent</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Critical" value={data.alertCritical} color="text-red-400" />
        <StatCard label="Warning"  value={data.alertWarning}  color="text-amber-400" />
        <StatCard label="Info"     value={data.alertInfo}     color="text-blue-400" />
      </div>

      <div className="rounded-xl bg-white/5 border border-white/8 p-3 mb-3">
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
          <Wind size={10} /> Kondisi Cuaca
        </p>
        <p className="text-xs text-amber-400">{data.cuacaStatus}</p>
      </div>

      <div className="space-y-2">
        {data.incidents.map((inc, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 flex items-start gap-2
            ${inc.severity === "CRITICAL" ? "bg-red-500/5 border border-red-500/15" :
              inc.severity === "WARNING"  ? "bg-amber-500/5 border border-amber-500/15" :
              "bg-blue-500/5 border border-blue-500/15"}
          `}>
            <AlertBadge priority={inc.severity} />
            <div className="min-w-0">
              <p className="text-xs text-white font-medium">{inc.kendaraan}</p>
              <p className="text-xs text-gray-500">{inc.jenis} · {inc.zona}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmissionCard({ data }: { data: EmissionData }) {
  const over = data.persentase > 100;
  const barColor = data.persentase > 110 ? "bg-red-500" : data.persentase > 100 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Wind size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Emission Report</p>
          <p className="text-gray-600 text-xs font-mono">Emission Agent</p>
        </div>
      </div>

      {/* CO2 gauge */}
      <div className="rounded-xl bg-white/5 border border-white/8 p-4 mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-gray-500">Emisi CO₂ Bulan Ini</p>
            <p className={`text-2xl font-bold font-mono mt-0.5 ${over ? "text-red-400" : "text-emerald-400"}`}>
              {data.actualBulan} <span className="text-sm font-normal text-gray-500">ton</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Target</p>
            <p className="text-sm font-mono text-gray-400">{data.targetBulan} ton</p>
          </div>
        </div>
        <ProgressBar value={data.persentase} color={barColor} />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-gray-600 font-mono">0%</span>
          <span className={`text-xs font-mono font-bold ${over ? "text-red-400" : "text-emerald-400"}`}>
            {data.persentase}% dari target
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="CO₂/Trip" value={`${data.co2PerTrip}t`} sub="rata-rata" />
        <StatCard label="Total Trip" value={data.totalTrip} sub="hari ini" />
        <StatCard
          label="Trend"
          value={`+${data.trendMingguIni}%`}
          sub="vs minggu lalu"
          color="text-red-400"
        />
      </div>
    </div>
  );
}

function ReclamationCard({ data }: { data: ReclamationData }) {
  const getStatusColor = (s: string) =>
    s === "Ahead" ? "text-emerald-400" : s === "Behind" ? "text-red-400" : "text-amber-400";
  const getBarColor = (c: number) =>
    c >= 85 ? "bg-emerald-500" : c >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Leaf size={15} className="text-green-400" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Reclamation Report</p>
          <p className="text-gray-600 text-xs font-mono">Reclamation Agent</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.zones.map((zone, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/8 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white font-medium">{zone.area}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold ${getStatusColor(zone.status)}`}>
                  {zone.status}
                </span>
                <span className="text-sm font-bold font-mono text-white">{zone.completion}%</span>
              </div>
            </div>
            <ProgressBar value={zone.completion} color={getBarColor(zone.completion)} />
            <p className="text-xs text-gray-600 mt-1.5 font-mono">
              Vegetasi Index: {zone.vegetasiIndex.toFixed(2)}
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
  const [history, setHistory]     = useState<HistoryItem[]>(MOCK_HISTORY);
  const [viewReport, setViewReport] = useState<HistoryItem | null>(null);

  // ── Generate report ──────────────────────────────────────────────────────
  // API integration point:
  // Replace mock setTimeout below with:
  //   const res = await fetch("/api/llm/report", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ tanggal, shift }),
  //   });
  //   const data = await res.json();
  //   setReport(data);
  const handleGenerate = useCallback(async () => {
    setStatus("loading");
    setReport(null);

    await new Promise((r) => setTimeout(r, 2200)); // simulate LLM latency

    const data = generateMockReport(tanggal, shift);
    setReport(data);
    setStatus("done");

    // prepend to history
    const newItem: HistoryItem = {
      id: `rpt-${Date.now()}`,
      tanggal,
      shift,
      status: "selesai",
      summary: data.executiveSummary.slice(0, 80) + "...",
    };
    setHistory((prev) => [newItem, ...prev]);
  }, [tanggal, shift]);

  return (
    <AppLayout>
      <Navbar title="LLM Report" />

      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* ── SECTION 1 : INPUT ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
          <SectionLabel icon={FileText} label="Generate Laporan BI" />

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Tanggal */}
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-mono block mb-1.5">Tanggal</label>
              <div className="relative">
                <CalendarDays size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  value={tanggal}
                  max={today}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono rounded-xl bg-[#0d1117] border border-[#1f2937] text-white focus:outline-none focus:border-amber-500/40 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Shift */}
            <div className="sm:w-40">
              <label className="text-xs text-gray-500 font-mono block mb-1.5">Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as Shift)}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl bg-[#0d1117] border border-[#1f2937] text-white focus:outline-none focus:border-amber-500/40"
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-semibold transition-colors"
              >
                {status === "loading" ? (
                  <><Loader2 size={14} className="animate-spin" /> Memproses...</>
                ) : (
                  <><RefreshCw size={14} /> Generate Laporan</>
                )}
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {status === "loading" && (
            <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 flex items-center gap-3">
              <Loader2 size={14} className="text-amber-400 animate-spin shrink-0" />
              <div>
                <p className="text-xs text-amber-400 font-semibold">LLM sedang memproses...</p>
                <p className="text-xs text-gray-500 mt-0.5">Mistral 7B menganalisis data dari 4 agent. Harap tunggu.</p>
              </div>
            </div>
          )}

          {status === "done" && report && (
            <div className="mt-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400">
                Laporan berhasil di-generate · {report.generatedAt}
              </p>
            </div>
          )}
        </div>

        {/* ── SECTIONS 2–4 : REPORT CONTENT ─────────────────────────────── */}
        {status === "idle" && !report && (
          <div className="rounded-2xl border border-dashed border-[#1f2937] py-16 text-center">
            <BarChart3 size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Pilih tanggal dan shift, lalu klik <span className="text-amber-400 font-semibold">Generate Laporan</span></p>
            <p className="text-gray-700 text-xs mt-1">Laporan akan di-generate oleh Mistral 7B dalam Bahasa Indonesia</p>
          </div>
        )}

        {report && (
          <>
            {/* ── SECTION 2 : EXECUTIVE SUMMARY ─────────────────────────── */}
            <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
              <SectionLabel icon={FileText} label="Executive Summary" />

              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={11} className="text-amber-400" />
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{report.executiveSummary}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-600 font-mono">
                  <Clock size={10} className="inline mr-1" />
                  {report.generatedAt}
                </span>
                <span className="text-xs text-gray-600 font-mono">·</span>
                <span className="text-xs text-gray-600 font-mono">
                  Shift {report.shift} · {new Date(report.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* ── SECTION 3 : DOMAIN CARDS ───────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-amber-400" />
                <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Laporan Per Domain</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FleetCard      data={report.fleet} />
                <SafetyCard     data={report.safety} />
                <EmissionCard   data={report.emission} />
                <ReclamationCard data={report.reclamation} />
              </div>
            </div>

            {/* ── SECTION 4 : ALERTS ─────────────────────────────────────── */}
            <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
              <SectionLabel icon={AlertTriangle} label="Alert & Anomali yang Dideteksi LLM" />

              <div className="space-y-3">
                {report.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`rounded-xl px-4 py-3 border flex gap-3 ${
                      alert.priority === "CRITICAL"
                        ? "bg-red-500/5 border-red-500/20"
                        : alert.priority === "WARNING"
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-blue-500/5 border-blue-500/20"
                    }`}
                  >
                    <AlertIcon priority={alert.priority} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <AlertBadge priority={alert.priority} />
                        <span className="text-xs text-gray-600 font-mono">{alert.waktu}</span>
                      </div>
                      <p className="text-sm text-white mb-1">{alert.message}</p>
                      <div className="flex items-start gap-1.5">
                        <ChevronRight size={11} className="text-gray-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-400">{alert.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SECTION 5 : HISTORY ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1f2937] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-400" />
              <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">Riwayat Laporan</span>
            </div>
            <span className="text-xs text-gray-600 font-mono">{history.length} laporan</span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f2937]">
                {["Tanggal", "Shift", "Status", "Ringkasan", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-gray-600 uppercase tracking-widest font-mono">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr
                  key={item.id}
                  className={`border-b border-[#1f2937]/50 hover:bg-white/5 transition-colors ${i === 0 && status === "done" ? "bg-amber-500/5" : ""}`}
                >
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono text-gray-300">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {i === 0 && status === "done" && (
                      <span className="ml-2 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Terbaru</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-gray-400 font-mono">{item.shift}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      item.status === "selesai"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-red-400 bg-red-500/10 border-red-500/20"
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    <p className="text-xs text-gray-500 truncate">{item.summary}</p>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setViewReport(viewReport?.id === item.id ? null : item)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-400 transition-colors font-mono"
                    >
                      <Eye size={11} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expanded history detail */}
          {viewReport && (
            <div className="px-5 py-4 border-t border-[#1f2937] bg-white/5">
              <p className="text-xs text-gray-500 font-mono mb-1">Detail laporan · {viewReport.id}</p>
              <p className="text-sm text-gray-300">{viewReport.summary}</p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}

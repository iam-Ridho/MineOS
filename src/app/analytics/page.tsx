import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import ProductionBarChart from "@/components/charts/ProductionBarChart";
import EfficiencyChart from "@/components/charts/EfficiencyChart";
import AgentStatusPieChart from "@/components/charts/AgentStatusPieChart";
import { mockKPIs } from "@/lib/api/mock-data";

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <Navbar title="Analytics" />

      <div className="p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Laporan Analitik</h2>
            <p className="text-gray-500 text-xs mt-0.5 font-mono">Data simulasi — Kideco, Batu Sopang, Paser, Kaltim</p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
            Mock Data
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductionBarChart />
          <EfficiencyChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AgentStatusPieChart />
          <div className="lg:col-span-2 rounded-xl border border-[#1f2937] bg-[#111827] p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Ringkasan Minggu Ini</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Produksi",      value: "32.170 ton", color: "text-amber-400" },
                { label: "Rata-rata/Hari",       value: "4.596 ton",  color: "text-blue-400" },
                { label: "Efisiensi Rata-rata",  value: "82,4%",      color: "text-emerald-400" },
                { label: "Downtime Total",       value: "14,2 jam",   color: "text-red-400" },
                { label: "Agent Aktif",          value: `${mockKPIs.activeAgents} / ${mockKPIs.totalAgents}`, color: "text-emerald-400" },
                { label: "Alert Terjadi",        value: "7 kali",     color: "text-red-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0d1117] rounded-lg p-3 border border-[#1f2937]">
                  <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-blue-400 text-xs font-mono">
            💬 Koordinasi Arya: tambah filter rentang tanggal dan export CSV di halaman ini.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
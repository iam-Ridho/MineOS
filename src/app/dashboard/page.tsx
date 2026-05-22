import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import KPICard from "@/components/ui/KPICard";
import ProductionChart from "@/components/charts/ProductionChart";
import { mockKPIs, mockAgents } from "@/lib/lib/api/mock-data";
import { Bot, Activity, AlertTriangle, Pickaxe } from "lucide-react";

export default function DashboardPage() {
  return (
    <AppLayout>
      <Navbar title="Dashboard" />

      <div className="p-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Agents"
            value={mockKPIs.totalAgents}
            icon={Bot}
            color="blue"
            trend="neutral"
            trendValue="sama"
          />
          <KPICard
            title="Agents Aktif"
            value={mockKPIs.activeAgents}
            icon={Activity}
            color="emerald"
            trend="up"
            trendValue="+2"
          />
          <KPICard
            title="Alert"
            value={mockKPIs.alertCount}
            icon={AlertTriangle}
            color="red"
            trend="down"
            trendValue="-1"
          />
          <KPICard
            title="Produksi Hari Ini"
            value={mockKPIs.productionRateToday.toLocaleString()}
            unit="ton"
            icon={Pickaxe}
            color="amber"
            trend="up"
            trendValue="+130 ton"
          />
        </div>

        {/* Chart */}
        <ProductionChart />

        {/* Status Agents */}
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Status Agents</h3>
          <div className="space-y-3">
            {mockAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#0d1117] border border-[#1f2937]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === "active"  ? "bg-emerald-400" :
                    agent.status === "idle"    ? "bg-amber-400" :
                    "bg-red-400"
                  }`} />
                  <span className="text-white text-sm">{agent.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    agent.status === "active"  ? "text-emerald-400 bg-emerald-500/10" :
                    agent.status === "idle"    ? "text-amber-400 bg-amber-500/10" :
                    "text-red-400 bg-red-500/10"
                  }`}>
                    {agent.status.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs font-mono">{agent.battery}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import StatusBadge from "@/components/ui/StatusBadge";
import { mockAgents } from "@/lib/api/mock-data";
import { Bot, Battery, MapPin } from "lucide-react";

export default function AgentsPage() {
  const active = mockAgents.filter((a) => a.status === "active").length;
  const idle   = mockAgents.filter((a) => a.status === "idle").length;
  const error  = mockAgents.filter((a) => a.status === "error").length;

  return (
    <AppLayout>
      <Navbar title="AI Agents" />

      <div className="p-6 space-y-6">

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aktif", value: active, color: "text-emerald-400" },
            { label: "Idle",  value: idle,   color: "text-amber-400" },
            { label: "Error", value: error,  color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-gray-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabel agents */}
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1f2937] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Daftar Agents</h3>
            <span className="text-xs text-gray-500 font-mono">mock data</span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1f2937]">
                {["Agent", "Status", "Lokasi", "Baterai"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-widest font-mono">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockAgents.map((agent) => (
                <tr key={agent.id} className="border-b border-[#1f2937]/50 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0d1117] border border-[#1f2937] flex items-center justify-center">
                        <Bot size={13} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{agent.name}</p>
                        <p className="text-gray-600 text-xs font-mono">{agent.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={agent.status as "active" | "idle" | "error"} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                      <MapPin size={11} />
                      {agent.location.lat.toFixed(4)}, {agent.location.lon.toFixed(4)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Battery size={13} className={
                        agent.battery > 50 ? "text-emerald-400" :
                        agent.battery > 20 ? "text-amber-400" :
                        "text-red-400"
                      } />
                      <span className="text-sm text-white font-mono">{agent.battery}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Catatan koordinasi */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-blue-400 text-xs font-mono">
            💬 Koordinasi Arya: tambah komponen filter, search, dan detail modal di halaman ini.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import AppLayout from "@/components/layout/AppLayout";
import Navbar from "@/components/layout/Navbar";
import { mockAgents, type Agent } from "@/lib/api/mock-data";
import { fetchAgents, subscribeAgents } from "@/lib/api/agents";
import { Bot, Battery, MapPin } from "lucide-react";

const CesiumViewer = dynamic(
  () => import("@/components/map/CesiumViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] rounded-xl bg-[#111827] border border-[#1f2937] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Memuat Digital Twin...</p>
          <p className="text-gray-600 text-xs mt-1 font-mono">Batu Sopang, Paser, Kaltim</p>
        </div>
      </div>
    ),
  }
);

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  idle:   "text-amber-400 bg-amber-500/10 border-amber-500/20",
  error:  "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function DigitalTwinPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAgents = async () => {
      try {
        setLoading(true);
        const data = await fetchAgents();
        if (!mounted) return;
        // Use live agents from backend, fallback to mockAgents if empty
        setAgents(data.length > 0 ? data : mockAgents);
      } catch (err) {
        console.error("Failed to load agents in Digital Twin:", err);
        if (mounted) setAgents(mockAgents);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAgents();

    // Subscribe to live updates in database
    const channel = subscribeAgents((data) => {
      if (mounted) {
        setAgents(data.length > 0 ? data : mockAgents);
      }
    });

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, []);

  return (
    <AppLayout>
      <Navbar title="Digital Twin" />

      <div className="p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Peta Digital Twin</h2>
            <p className="text-gray-500 text-xs mt-0.5 font-mono">
              Lokasi real-time agents — Kideco, Batu Sopang, Paser, Kaltim
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {["active", "idle", "error"].map((s) => (
              <span key={s} className={`px-2 py-1 rounded border font-mono ${STATUS_STYLE[s]}`}>
                {s.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="h-[500px]">
          <CesiumViewer agents={agents} />
        </div>

        <div className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1f2937]">
            <h3 className="text-white font-semibold text-sm">Posisi Agent {loading && "(Memperbarui...)"}</h3>
          </div>
          <div className="divide-y divide-[#1f2937]">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0d1117] border border-[#1f2937] flex items-center justify-center">
                    <Bot size={13} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm">{agent.name}</p>
                    <p className="text-gray-600 text-xs font-mono">{agent.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                    <MapPin size={11} />
                    {agent.location.lat.toFixed(4)}, {agent.location.lon.toFixed(4)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <Battery size={11} className={
                      agent.battery > 50 ? "text-emerald-400" :
                      agent.battery > 20 ? "text-amber-400" : "text-red-400"
                    } />
                    <span className="text-white">{agent.battery}%</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STATUS_STYLE[agent.status]}`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

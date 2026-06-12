// src/app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { 
  Truck, ShieldAlert, Leaf, Sprout, TrendingUp, TrendingDown, 
  Sparkles, X, Wifi, WifiOff, AlertTriangle, Zap
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { 
  subscribeToAIDecisions, 
  subscribeToAlerts,
  fetchAIDecisions, 
  fetchAlerts,
  AIDecision,
  SupabaseAlert
} from "@/lib/supabase";

type UnifiedDecision = {
  id: string;
  source: 'local' | 'supabase';
  agent: string;
  message: string;
  time: string;
  status?: string;
  confidence?: number;
  severity: 'normal' | 'critical' | 'warning';
};

export default function Page() {
  const { vehicles, setVehicles, recommendations, setRecommendations, addAgentLog } = useTelemetry();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>("HAUL-01");
  const [alerts, setAlerts] = useState<SupabaseAlert[]>([]);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([]);
  const [activeTab, setActiveTab] = useState<'ai' | 'alerts'>('ai');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  const userName = process.env.NEXT_PUBLIC_USER_NAME || 'User';

  const allDecisions: UnifiedDecision[] = [
    ...recommendations.map(r => ({
      id: r.id,
      source: 'local' as const,
      agent: r.agent,
      message: r.message,
      time: r.time,
      status: r.status,
      severity: (r.agent === 'SAFETY AGENT' ? 'critical' : 'normal') as 'normal' | 'critical' | 'warning',
    })),
    ...aiDecisions.map(d => ({
      id: d.id,
      source: 'supabase' as const,
      agent: `Agent #${d.agent_id}`,
      message: d.decision,
      time: new Date(d.timestamp).toLocaleTimeString(),
      confidence: d.confidence,
      severity: (d.confidence >= 0.8 ? 'normal' : d.confidence >= 0.6 ? 'warning' : 'critical') as 'normal' | 'critical' | 'warning',
    }))
  ];

  // ==========================================
  // FETCH AI DECISIONS + REALTIME
  // ==========================================
  useEffect(() => {
    let mounted = true;
    let channel: any;

    const init = async () => {
      const existing = await fetchAIDecisions();
      if (mounted) setAiDecisions(existing);

      channel = subscribeToAIDecisions(
        (newDecision) => {
          if (!mounted) return;
          setConnectionStatus('connected');
          setAiDecisions((prev) => {
            const exists = prev.find((d) => d.id === newDecision.id);
            if (exists) {
              return prev.map((d) => d.id === newDecision.id ? newDecision : d);
            }
            return [newDecision, ...prev].slice(0, 10);
          });
        },
        (err) => {
          if (!mounted) return;
          setConnectionStatus('error');
          console.error('Supabase AI error:', err);
        }
      );
    };

    init();

    return () => {
      mounted = false;
      if (channel?.unsubscribe) channel.unsubscribe();
    };
  }, []);

  // ==========================================
  // FETCH ALERTS + REALTIME
  // ==========================================
  useEffect(() => {
    let mounted = true;
    let channel: any;

    const init = async () => {
      const existing = await fetchAlerts();
      if (mounted) setAlerts(existing);

      channel = subscribeToAlerts(
        (newAlert) => {
          if (!mounted) return;
          setAlerts((prev) => {
            const exists = prev.find((a) => a.id === newAlert.id);
            if (exists) {
              return prev.map((a) => a.id === newAlert.id ? newAlert : a);
            }
            return [newAlert, ...prev].slice(0, 20);
          });
        },
        (err) => {
          console.error('Supabase alerts error:', err);
        }
      );
    };

    init();

    return () => {
      mounted = false;
      if (channel?.unsubscribe) channel.unsubscribe();
    };
  }, []);

  const handleExecuteRec = (id: string, agent: string, message: string) => {
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: "Executed" } : r));
    if (agent === "FLEET AGENT") {
      addAgentLog({ id: String(Date.now()), agent: "Fleet", message: "SYSTEM DISPATCH: Fleet rerouted." });
      setVehicles(prev => prev.map(v => v.id === "HAUL-01" ? { ...v, speed: 42.1 } : v));
    } else if (agent === "SAFETY AGENT") {
      addAgentLog({ id: String(Date.now()), agent: "Safety", message: "EMERGENCY ALARM ACTIVE." });
    } else if (agent === "EMISSION AGENT") {
      addAgentLog({ id: String(Date.now()), agent: "Emission", message: "MAINTENANCE ORDER FILED." });
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId 
        ? { ...a, acknowledged: true, acknowledged_by: userName } 
        : a
    ));
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'border-rose-500 animate-pulse bg-rose-50/50';
      case 'warning': return 'border-yellow-500 bg-yellow-500/5';
      case 'info': return 'border-blue-500 bg-blue-50/50';
      default: return 'border-slate-300 bg-slate-100/30';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border-b border-slate-200">
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Vehicles</span>
            <Truck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-sans text-3xl font-extrabold text-slate-900">{vehicles.length || 0}</span>
            <span className="flex items-center text-emerald-600 font-mono text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +3.2%
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Safety Alerts</span>
            <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-sans text-3xl font-extrabold text-slate-900">{String(alerts.filter(a => !a.acknowledged).length).padStart(2, '0')}</span>
            <span className="font-mono text-[11px] text-slate-500 font-semibold">Active 24h</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Daily CO2 Saving</span>
            <Leaf className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-sans text-3xl font-extrabold text-slate-900">4.8t</span>
            <span className="flex items-center text-emerald-600 font-mono text-xs font-bold">
              <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> -12%
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold">Reclamation Done</span>
            <Sprout className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 flex flex-col w-full">
            <span className="font-sans text-3xl font-extrabold text-slate-900">68.4%</span>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: "68.4%" }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden flex flex-col">
          <div className="absolute inset-0 opacity-10 pointer-events-none select-none mix-blend-multiply overflow-hidden" 
               style={{ backgroundImage: `radial-gradient(#bec6e0 0.75px, transparent 0.75px)`, backgroundSize: '20px 20px' }}>
          </div>

          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-50 to-slate-100">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_bajJlNKPIGSVal-Nm3_OnaA5RD6WuidI2QktlysBP6xomHb5JF56V-qZZhcbdCiMwjwS3w_9-Kd15Q4pYw10lCE8QrY9kRaSmigIrryDc2ljFtBxURoJ4d_Yqjrnsc286qw7HrHAtWC8tVl2cjpAB0lzdRflBQ9zocpJQ0vU-ZgS07mW6B_AQjdYa_5IbjLHxWmq_Qa2xqs8IfFEqK1c4IIPZgB3gWRe7uJ0mhojipTppo2AdzVflKIekSA7HV70SX4IpAuddc7k"
              alt="Contour GIS"
              className="w-full h-full object-cover opacity-15 mix-blend-multiply scale-105"
            />
            <div className="absolute left-0 w-full h-[2px] bg-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-scan top-0 z-10 pointer-events-none"></div>
          </div>

          {/* HUD Controls */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-3 max-w-[280px]">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-200 border-l-4 border-blue-500 flex items-center gap-3 shadow-lg">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-slate-600">LIVE FEED: PIT ALPHA</span>
            </div>

            <div className="bg-white/90 backdrop-blur-md p-3 rounded-lg border border-slate-200 space-y-1.5 transition-all shadow-lg text-slate-500 text-xs font-mono">
              {vehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(prev => prev === v.id ? null : v.id)}
                  className={`w-full flex justify-between items-center px-2 py-1 rounded text-left transition-all ${
                    selectedVehicleId === v.id ? "bg-blue-50 border border-blue-300 text-slate-900" : "hover:bg-slate-100/40 text-slate-500"
                  }`}
                >
                  <span className="font-mono text-xs font-bold">{v.id}</span>
                  <span className={`text-[10px] font-bold tracking-tighter px-1.5 py-0.5 rounded leading-none ${
                    v.state === "MOVING" ? "bg-emerald-100 text-emerald-600" :
                    v.state === "LOADING" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-700"
                  }`}>{v.state}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Metrics Popup */}
          {selectedVehicleId && selectedVehicle && (
            <div className="absolute lg:bottom-6 bottom-4 lg:left-5 left-4 z-30 w-72 bg-slate-100 border-t-2 border-blue-500 rounded-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
              <div className="bg-white px-4 py-3 flex justify-between items-center border-b border-slate-200">
                <span className="font-mono text-xs font-bold text-slate-900">METRICS: {selectedVehicle.id}</span>
                <button onClick={() => setSelectedVehicleId(null)} className="text-slate-500 hover:text-slate-900"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase font-bold">Speed</p>
                    <p className="font-bold text-slate-900">{selectedVehicle.speed} km/h</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[9px] uppercase font-bold">Fuel</p>
                    <p className="font-bold text-blue-600">{selectedVehicle.fuel}%</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 text-[9px] uppercase font-bold">Combustion Engine Health</span>
                  <div className="w-full bg-white h-2 rounded overflow-hidden border border-slate-200">
                    <div className="bg-emerald-500 h-full" style={{ width: `${selectedVehicle.health}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col z-10">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex-1 px-4 py-3 font-mono text-[11px] font-bold uppercase transition-all ${
                activeTab === 'ai' 
                  ? 'bg-slate-100/30 border-b-2 border-blue-500 text-blue-600' 
                  : 'bg-slate-100/10 border-b border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                AI Decisions
                {allDecisions.length > 0 && (
                  <span className="bg-cyan-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full">
                    {allDecisions.length}
                  </span>
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 px-4 py-3 font-mono text-[11px] font-bold uppercase transition-all ${
                activeTab === 'alerts' 
                  ? 'bg-slate-100/30 border-b-2 border-rose-500 text-rose-600' 
                  : 'bg-slate-100/10 border-b border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Alerts
                {alerts.filter(a => !a.acknowledged).length > 0 && (
                  <span className="bg-rose-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full">
                    {alerts.filter(a => !a.acknowledged).length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Connection Status */}
          <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase text-slate-500 font-bold">Real-time Status</span>
            <div className="flex items-center gap-1.5">
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span className="font-mono text-[9px] text-emerald-600 font-bold">LIVE</span>
                </>
              ) : connectionStatus === 'error' ? (
                <>
                  <WifiOff className="w-3 h-3 text-rose-600" />
                  <span className="font-mono text-[9px] text-rose-600 font-bold">ERROR</span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-[9px] text-yellow-400 font-bold">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'ai' ? (
              <>
                {/* Stats */}
                <div className="p-3 border border-slate-200 rounded bg-white/30 font-mono text-[9px] text-slate-500">
                  <div className="flex justify-between mb-1">
                    <span className="text-blue-600 font-bold">AI Decision Feed</span>
                    <span>{allDecisions.length} total</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-purple-600">{aiDecisions.length} supabase</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-600">{recommendations.filter(r => r.status === 'Executed').length} executed</span>
                  </div>
                </div>

                {/* All Decisions List */}
                {allDecisions.length > 0 ? allDecisions.map((decision) => {
                  const isLocal = decision.source === 'local';
                  const isPending = isLocal && decision.status === 'Pending';
                  const isCritical = decision.severity === 'critical';
                  
                  return (
                    <div 
                      key={`${decision.source}-${decision.id}`} 
                      className={`bg-slate-50/60 border border-slate-200 rounded-lg p-4 border-l-2 ${
                        isCritical ? 'border-rose-500 animate-pulse' : 
                        !isLocal ? 'border-purple-500' : 'border-blue-500'
                      } ${!isPending && isLocal ? "opacity-55" : ""}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {!isLocal ? (
                            <Zap className="w-3 h-3 text-purple-600" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-blue-600" />
                          )}
                          <span className={`font-mono text-[10px] font-bold ${
                            isCritical ? 'text-rose-600' : 
                            !isLocal ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {decision.agent}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] text-slate-500">{decision.time}</span>
                      </div>
                      
                      <p className="font-sans text-xs text-slate-700 leading-relaxed mb-2">
                        {decision.message}
                      </p>

                      {!isLocal && decision.confidence !== undefined && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-mono text-slate-500">Confidence:</span>
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                decision.confidence >= 0.8 ? 'bg-emerald-500' :
                                decision.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.round(decision.confidence * 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold text-[10px] font-mono ${
                            decision.confidence >= 0.8 ? 'text-emerald-600' :
                            decision.confidence >= 0.6 ? 'text-yellow-400' : 'text-rose-600'
                          }`}>
                            {Math.round(decision.confidence * 100)}%
                          </span>
                        </div>
                      )}

                      {isPending ? (
                        <button 
                          onClick={() => handleExecuteRec(decision.id, decision.agent, decision.message)} 
                          className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-900 font-mono text-[9px] rounded font-bold transition-all"
                        >
                          EXECUTE
                        </button>
                      ) : isLocal ? (
                        <span className="block text-[9px] uppercase tracking-widest text-emerald-600 text-center font-mono">
                          Status: {decision.status}
                        </span>
                      ) : null}
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-500 font-mono text-xs">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No AI decisions yet</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Alerts Feed */}
                <div className="p-3 border border-slate-200 rounded bg-white/30 font-mono text-[9px] text-slate-500">
                  <p className="text-rose-600 font-bold mb-1">Active Alerts</p>
                  <p>{alerts.filter(a => !a.acknowledged).length} unacknowledged / {alerts.length} total</p>
                </div>

                {alerts.length > 0 ? alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`bg-slate-50/60 border rounded-lg p-4 border-l-2 ${getSeverityColor(alert.severity)} ${alert.acknowledged ? "opacity-50" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {alert.severity === 'critical' ? <ShieldAlert className="w-4 h-4 text-rose-600" /> :
                         alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                         <Sparkles className="w-4 h-4 text-blue-600" />}
                        <span className={`font-mono text-[10px] font-bold uppercase ${
                          alert.severity === 'critical' ? 'text-rose-600' :
                          alert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-600'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      {alert.created_at && (
                        <span className="font-mono text-[9px] text-slate-500">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    
                    <p className="font-sans text-xs text-slate-700 leading-relaxed mb-2">{alert.message}</p>
                    
                    {alert.location && (
                      <p className="font-mono text-[9px] text-slate-500 mb-2">📍 {alert.location}</p>
                    )}

                    {!alert.acknowledged ? (
                      <button 
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="w-full py-1.5 bg-slate-100 hover:bg-slate-700 text-slate-700 font-mono text-[9px] rounded font-bold border border-slate-300 transition-all"
                      >
                        ACKNOWLEDGE
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600 font-mono text-[9px]">
                        <span>✓ Acknowledged by {alert.acknowledged_by || userName}</span>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-slate-500 font-mono text-xs">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No active alerts</p>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
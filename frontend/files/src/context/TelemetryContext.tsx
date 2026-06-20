"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Vehicle,
  Agent,
  Recommendation,
  TelemetryStreamItem,
  SystemMetrics,
  AgentLog
} from "@/types";
import {
  INITIAL_AGENTS,
  INITIAL_RECOMMENDATIONS,
  INITIAL_TELEMETRY
} from "@/lib/api/mock-data";

interface TelemetryContextProps {
  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  recommendations: Recommendation[];
  setRecommendations: React.Dispatch<React.SetStateAction<Recommendation[]>>;
  telemetryStream: TelemetryStreamItem[];
  setTelemetryStream: React.Dispatch<React.SetStateAction<TelemetryStreamItem[]>>;
  systemMetrics: SystemMetrics;
  setSystemMetrics: React.Dispatch<React.SetStateAction<SystemMetrics>>;
  emergencyStop: boolean;
  setEmergencyStop: (stop: boolean) => void;
  wsConnected: boolean;
  addAgentLog: (log: AgentLog) => void;
  refetchTelemetry: () => void;
}

const TelemetryContext = createContext<TelemetryContextProps | undefined>(undefined);

// Backend WebSocket Anda (FastAPI) — bukan Next.js dev server (localhost:3000)
const TELEMETRY_WS_URL =
  process.env.NEXT_PUBLIC_TELEMETRY_WS_URL || "wss://localhost:8000/ws/telemetry";

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [emergencyStop, setEmergencyStop] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: "HAUL-01", state: "MOVING", lat: -1.99219, lon: 115.87023, speed: 32.4, fuel: 68, loadWeight: 184.2, fatigueScore: 0.08, health: 92, routeProgress: 45 },
    { id: "LOAD-04", state: "LOADING", lat: -1.84968, lon: 115.81718, speed: 0.0, fuel: 54, loadWeight: 145.8, fatigueScore: 0.12, health: 89, routeProgress: 100 },
    { id: "HAUL-02", state: "IDLE", lat: -1.98185, lon: 115.83984, speed: 0.0, fuel: 82, loadWeight: 0.0, fatigueScore: 0.02, health: 95, routeProgress: 0 }
  ]);
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(INITIAL_RECOMMENDATIONS);
  const [telemetryStream, setTelemetryStream] = useState<TelemetryStreamItem[]>(INITIAL_TELEMETRY);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    inferenceLatency: 24,
    activeNodes: "4/4",
    globalTokenUsage: 75,
    logicConsistency: 99.8
  });
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // emergencyStop dibaca via ref agar tidak perlu masuk dependency useEffect
  const emergencyStopRef = useRef(emergencyStop);
  useEffect(() => { emergencyStopRef.current = emergencyStop; }, [emergencyStop]);

  const addAgentLog = (log: AgentLog) => {
    setAgents(prev => prev.map(ag => {
      const lowerId = ag.id.toLowerCase();
      const incomingId = log.agent.toLowerCase();
      if (lowerId === incomingId || (lowerId === "reclamation" && incomingId === "reclaim")) {
        return {
          ...ag,
          logs: [{ id: String(Date.now()), agent: log.agent, message: log.message }, ...ag.logs]
        };
      }
      return ag;
    }));
  };

  const refetchTelemetry = () => {
    setSystemMetrics(prev => ({ ...prev, inferenceLatency: 18, logicConsistency: 99.9 }));
  };

  // useEffect(() => {
  //   let ws: WebSocket | null = null;
  //   let fallbackInterval: NodeJS.Timeout | null = null;
  //   let reconnectTimeout: NodeJS.Timeout | null = null;
  //   let cancelled = false;

  //   const connect = () => {
  //     if (cancelled) return;

  //     try {
  //       ws = new WebSocket(TELEMETRY_WS_URL);

  //       ws.onopen = () => {
  //         setWsConnected(true);
  //         // Backend WS hidup -> hentikan fallback loop simulasi
  //         if (fallbackInterval) {
  //           clearInterval(fallbackInterval);
  //           fallbackInterval = null;
  //         }
  //       };

  //       ws.onmessage = (event) => {
  //         try {
  //           const packet = JSON.parse(event.data);
  //           if (packet.type === "TELEMETRY") {
  //             if (packet.vehicles) setVehicles(packet.vehicles);
  //             if (packet.telemetryStream) setTelemetryStream(packet.telemetryStream);
  //             if (packet.metrics) setSystemMetrics(packet.metrics);
  //           }
  //         } catch {}
  //       };

  //       ws.onerror = () => setWsConnected(false);

  //       ws.onclose = () => {
  //         setWsConnected(false);
  //         if (cancelled) return;
  //         startFallbackLoop();
  //         // Coba reconnect ke backend WS setiap 5 detik
  //         reconnectTimeout = setTimeout(connect, 5000);
  //       };
  //     } catch {
  //       startFallbackLoop();
  //       reconnectTimeout = setTimeout(connect, 5000);
  //     }
  //   };

  //   function startFallbackLoop() {
  //     if (fallbackInterval) return; // sudah jalan, jangan duplikat
  //     fallbackInterval = setInterval(() => {
  //       setVehicles(prev => prev.map(v => {
  //         if (emergencyStopRef.current) return { ...v, speed: 0, state: "IDLE" };
  //         let nextProgress = v.routeProgress;
  //         let nextLat = v.lat;
  //         let nextLon = v.lon;
  //         let nextSpeed = v.speed;

  //         if (v.state === "MOVING") {
  //           nextProgress = v.routeProgress + 2;
  //           if (nextProgress >= 100) nextProgress = 0;
  //           nextLat = v.id === "HAUL-01" ? 28.349129 + (nextProgress * 0.00004) : 28.350320 - (nextProgress * 0.00003);
  //           nextLon = v.id === "HAUL-01" ? 118.294102 + (nextProgress * 0.00003) : 118.294950 + (nextProgress * 0.00002);
  //           nextSpeed = 31 + Math.random() * 4 - 2;
  //         }
  //         return {
  //           ...v,
  //           routeProgress: nextProgress,
  //           lat: Number(nextLat.toFixed(6)),
  //           lon: Number(nextLon.toFixed(6)),
  //           speed: Number(nextSpeed.toFixed(1))
  //         };
  //       }));

  //       setTelemetryStream(prev => prev.map(item => {
  //         let change = (Math.random() - 0.5) * (item.value * 0.015);
  //         return {
  //           ...item,
  //           timestamp: new Date().toLocaleTimeString(),
  //           value: Number((item.value + change).toFixed(item.metric === "TPH" ? 0 : 1))
  //         };
  //       }));

  //       setSystemMetrics(prev => ({ ...prev, inferenceLatency: 20 + Math.floor(Math.random() * 8) }));
  //     }, 1500);
  //   }

  //   connect();

  //   return () => {
  //     cancelled = true;
  //     if (ws) ws.close();
  //     if (fallbackInterval) clearInterval(fallbackInterval);
  //     if (reconnectTimeout) clearTimeout(reconnectTimeout);
  //   };
  // }, []); // ← hanya jalan sekali, emergencyStop diakses via ref

  useEffect(() => {
  let fallbackInterval: NodeJS.Timeout | null = null;

  fallbackInterval = setInterval(() => {
    setVehicles(prev => prev.map(v => {
      if (emergencyStopRef.current) return { ...v, speed: 0, state: "IDLE" };
      let nextProgress = v.routeProgress;
      let nextLat = v.lat;
      let nextLon = v.lon;
      let nextSpeed = v.speed;

      if (v.state === "MOVING") {
        nextProgress = v.routeProgress + 2;
        if (nextProgress >= 100) nextProgress = 0;
        nextLat = v.id === "HAUL-01" ? 28.349129 + (nextProgress * 0.00004) : 28.350320 - (nextProgress * 0.00003);
        nextLon = v.id === "HAUL-01" ? 118.294102 + (nextProgress * 0.00003) : 118.294950 + (nextProgress * 0.00002);
        nextSpeed = 31 + Math.random() * 4 - 2;
      }
      return {
        ...v,
        routeProgress: nextProgress,
        lat: Number(nextLat.toFixed(6)),
        lon: Number(nextLon.toFixed(6)),
        speed: Number(nextSpeed.toFixed(1))
      };
    }));

    setTelemetryStream(prev => prev.map(item => {
      let change = (Math.random() - 0.5) * (item.value * 0.015);
      return {
        ...item,
        timestamp: new Date().toLocaleTimeString(),
        value: Number((item.value + change).toFixed(item.metric === "TPH" ? 0 : 1))
      };
    }));

    setSystemMetrics(prev => ({ ...prev, inferenceLatency: 20 + Math.floor(Math.random() * 8) }));
  }, 1500);

  setWsConnected(false); // tidak ada backend WS, jadi selalu false

  return () => {
    if (fallbackInterval) clearInterval(fallbackInterval);
  };
  }, []); // emergencyStop dibaca via emergencyStopRef, tidak perlu di dependency

  return (
    <TelemetryContext.Provider value={{
      vehicles, setVehicles, agents, setAgents, recommendations, setRecommendations,
      telemetryStream, setTelemetryStream, systemMetrics, setSystemMetrics,
      emergencyStop, setEmergencyStop, wsConnected, addAgentLog, refetchTelemetry
    }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error("useTelemetry must be used within a TelemetryProvider");
  return context;
}
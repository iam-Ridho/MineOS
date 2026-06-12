// src/components/fleet/ActiveFleet.tsx
'use client';

import { FleetAgent } from '@/types/fleet';

interface ActiveFleetProps {
  agents: FleetAgent[];
}

export default function ActiveFleet({ agents }: ActiveFleetProps) {
  return (
    <div className="grid gap-4">
      {agents.map((agent) => (
        <div key={agent.id} className="p-4 border rounded-lg">
          <div className="flex justify-between">
            <h3>{agent.name}</h3>
            <span className={`badge-${agent.status}`}>{agent.status}</span>
          </div>
          <p>Type: {agent.type}</p>
          <p>Fuel: {agent.fuel}%</p>
          <p>Battery: {agent.battery}%</p>
          <p>Location: {agent.location.lat}, {agent.location.lon}</p>
          <p>Operator: {agent.operator}</p>
          <p>Zone: {agent.zone}</p>
        </div>
      ))}
    </div>
  );
}
// src/lib/supabase.ts
"use client";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdluhsmjinqztjwneegw.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AIDecision {
  id: string;
  agent_id: string;
  decision: string;
  confidence: number;
  timestamp: string;
  priority_level?: string;
  action?: string;
  parameters?: any;
  result?: string;
}

export interface SupabaseAlert {
  id: number;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  acknowledged: boolean;
  acknowledged_by?: string;
  created_at?: string;
  location?: string;
  alert_type?: string;
}

// ==========================================
// PARSER AI DECISIONS
// ==========================================
function parseAIDecision(raw: any): AIDecision {
  const agents = raw?.triggered_agents || [];
  const agentName = Array.isArray(agents) && agents.length > 0 
    ? String(agents[0]).replace(/["\[\]]/g, '') 
    : String(raw?.agent_id || raw?.agent || 'AI');

  const priority = raw?.priority_level || 'NORMAL';
  const confidence = priority === 'WASPADA' ? 0.3 : 0.8;

  return {
    id: String(raw?.id || Date.now()),
    agent_id: agentName,
    decision: String(raw?.decision_text || raw?.decision || raw?.message || 'No message'),
    confidence: confidence,
    timestamp: String(raw?.timestamp || raw?.created_at || new Date().toISOString()),
    priority_level: String(priority),
    action: raw?.action || raw?.action_text || undefined,
    parameters: raw?.parameters || raw?.payload || undefined,
    result: raw?.result || raw?.outcome || undefined,
  };
}

// ==========================================
// PARSER ALERTS
// ==========================================
function parseAlert(raw: any): SupabaseAlert {
  const severityMap: Record<string, 'critical' | 'warning' | 'info'> = {
    'WASPADA': 'warning',
    'NORMAL': 'info',
    'KRITIS': 'critical',
    'CRITICAL': 'critical',
    'WARNING': 'warning',
    'INFO': 'info',
  };

  const rawSeverity = String(raw?.severity || raw?.alert_type || 'NORMAL');
  const severity = severityMap[rawSeverity] || 'info';

  return {
    id: Number(raw?.id || 0),
    message: String(raw?.message || raw?.content || raw?.description || 'Alert'),
    severity: severity,
    acknowledged: Boolean(raw?.acknowledged || false),
    acknowledged_by: raw?.acknowledged_by || raw?.acknowledgedBy || undefined,
    created_at: raw?.created_at || raw?.createdAt || undefined,
    location: raw?.location || undefined,
    alert_type: raw?.alert_type || undefined,
  };
}

// ==========================================
// FETCH AI DECISIONS
// ==========================================
export async function fetchAIDecisions() {
  const { data, error } = await supabase
    .from('ai_decisions')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Error fetch ai_decisions:', error);
    return [];
  }
  
  console.log('📦 ai_decisions raw:', data);
  const result: AIDecision[] = [];
  for (const item of (data || [])) {
    result.push(parseAIDecision(item));
  }
  return result;
}

// ==========================================
// FETCH ALERTS — FIX: Hapus type annotation bermasalah
// ==========================================
export async function fetchAlerts() {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('❌ Error fetch alerts:', error);
    return [];
  }
  
  console.log('📦 alerts raw:', data);
  
  // FIX: Gunakan loop biasa, bukan .map()
  const result: SupabaseAlert[] = [];
  for (const item of (data || [])) {
    result.push(parseAlert(item));
  }
  return result;
}

export interface VehiclePosition {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

function parseVehiclePosition(raw: any): VehiclePosition {
  return {
    id: String(raw?.id || Date.now()),
    vehicle_id: String(raw?.vehicle_id || raw?.vehicle || 'unknown'),
    latitude: Number(raw?.latitude || raw?.lat || 0),
    longitude: Number(raw?.longitude || raw?.lon || 0),
    altitude: raw?.altitude !== undefined ? Number(raw?.altitude) : undefined,
    speed: raw?.speed !== undefined ? Number(raw?.speed) : undefined,
    heading: raw?.heading !== undefined ? Number(raw?.heading) : undefined,
    timestamp: String(raw?.timestamp || raw?.created_at || new Date().toISOString()),
  };
}

export async function getVehiclePositions() {
  const { data, error } = await supabase
    .from('vehicle_positions')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error fetch vehicle positions:', error);
    return [];
  }

  console.log('📦 vehicle_positions raw:', data);

  const result: VehiclePosition[] = [];
  for (const item of (data || [])) {
    result.push(parseVehiclePosition(item));
  }
  return result;
}

let vehiclePositionsChannel: any = null;

export function subscribeToVehiclePositions(
  onNewPosition: (position: VehiclePosition) => void,
  onError?: (error: any) => void
) {
  if (vehiclePositionsChannel) {
    vehiclePositionsChannel.unsubscribe();
    supabase.removeChannel(vehiclePositionsChannel);
  }

  vehiclePositionsChannel = supabase
    .channel('vehicle_positions_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'vehicle_positions' },
      (payload) => {
        console.log('🆕 Vehicle position realtime:', payload.new);
        const parsed = parseVehiclePosition(payload.new);
        onNewPosition(parsed);
      }
    )
    .subscribe((status) => {
      console.log('📡 Vehicle positions status:', status);
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Channel error'));
      }
    });

  return vehiclePositionsChannel;
}

// ==========================================
// REALTIME SUBSCRIPTION
// ==========================================
let aiDecisionsChannel: any = null;
let alertsChannel: any = null;

export function subscribeToAIDecisions(
  onNewDecision: (decision: AIDecision) => void,
  onError?: (error: any) => void
) {
  if (aiDecisionsChannel) {
    aiDecisionsChannel.unsubscribe();
    supabase.removeChannel(aiDecisionsChannel);
  }

  aiDecisionsChannel = supabase
    .channel('ai_decisions_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ai_decisions' },
      (payload) => {
        console.log('🆕 AI Decision realtime:', payload.new);
        const parsed = parseAIDecision(payload.new);
        onNewDecision(parsed);
      }
    )
    .subscribe((status) => {
      console.log('📡 AI Decisions status:', status);
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Channel error'));
      }
    });

  return aiDecisionsChannel;
}

export function subscribeToAlerts(
  onNewAlert: (alert: SupabaseAlert) => void,
  onError?: (error: any) => void
) {
  if (alertsChannel) {
    alertsChannel.unsubscribe();
    supabase.removeChannel(alertsChannel);
  }

  alertsChannel = supabase
    .channel('alerts_channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts' },
      (payload) => {
        console.log('🆕 Alert realtime:', payload.new);
        const parsed = parseAlert(payload.new);
        onNewAlert(parsed);
      }
    )
    .subscribe((status) => {
      console.log('📡 Alerts status:', status);
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error('Channel error'));
      }
    });

  return alertsChannel;
}
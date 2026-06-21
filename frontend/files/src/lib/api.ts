/**
 * API Service untuk MineOS Backend
 * Base URL: http://[IP_LAPTOP_KAMU]:8000
 */

const API_BASE_URL = "https://mine-os-3slq.vercel.app";

// ==========================================
// Type Definitions
// ==========================================

export interface Vehicle {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  location?: {
    latitude: number;
    longitude: number;
  };
  speed?: number;
  fuel?: number;
  lastUpdate?: string;
  [key: string]: any;
}

export interface Agent {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'busy';
  activeDecisions?: number;
  lastActive?: string;
}

export interface Alert {
  id: number;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  type: string;
}

export interface Emission {
  date: string;
  value: number;
  unit: string;
  threshold?: number;
}

export interface Production {
  period: string;
  value: number;
  unit: string;
  target?: number;
}

// ==========================================
// LLM Report Types
// ==========================================

export type Shift = "Pagi" | "Siang" | "Malam";
export type AlertPriority = "CRITICAL" | "WARNING" | "INFO";

export interface LLMReportPayload {
  scenario: string;
  tanggal: string;
  shift: string;
}

export interface LLMReportResponse {
  generated_at?: string;
  generatedAt?: string;
  tanggal?: string;
  shift?: string;
  executive_summary?: string;
  executiveSummary?: string;
  fleet?: object;
  safety?: object;
  emission?: object;
  reclamation?: object;
  alerts?: object[];
  [key: string]: any;
}

export interface ReportRow {
  id?: string;
  timestamp?: string;
  created_at?: string;
  tanggal?: string;
  date?: string;
  report_date?: string;
  shift?: string;
  status?: string;
  summary?: string;
  executive_summary?: string;
  decision_text?: string;
  report?: object;
  [key: string]: any;
}

export interface ReclamationZoneRow {
  area?: string;
  name?: string;
  zone?: string;
  completion?: number;
  progress?: number;
  completion_percentage?: number;
  vegetasiIndex?: number;
  vegetasi_index?: number;
  vegetation_index?: number;
  status?: string;
  [key: string]: any;
}

// ==========================================
// Generic API Call Functions
// ==========================================

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }
  return response.json();
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    throw error;
  }
}

export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      },
      body: JSON.stringify(data || {}),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
}

export async function apiPut<T>(endpoint: string, data: any): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '69420'
      },
    });
    return handleResponse(response);
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
}

// ==========================================
// Vehicles API
// ==========================================

export async function getVehiclesLive(): Promise<Vehicle[]> {
  const response = await apiGet<{ data: Vehicle[] }>('/api/vehicles/live');
  return response.data;
}

// ==========================================
// Agents API
// ==========================================

export async function getAgentsStatus(): Promise<Agent[]> {
  const response = await apiGet<{ data: Agent[] }>('/api/agents/status');
  return response.data;
}

// ==========================================
// Alerts API
// ==========================================

export async function getActiveAlerts(): Promise<Alert[]> {
  const response = await apiGet<{ data: Alert[] }>('/api/alerts/active');
  return response.data;
}

export async function acknowledgeAlert(
  alertId: number,
  acknowledgedBy: string
): Promise<any> {
  return apiPost('/api/alerts/acknowledge', {
    alert_id: alertId,
    acknowledged_by: acknowledgedBy,
  });
}

// ==========================================
// Emissions API
// ==========================================

export async function getEmissionsToday(): Promise<Emission> {
  const response = await apiGet<{ data: Emission }>('/api/emissions/today');
  return response.data;
}

// ==========================================
// Analytics API
// ==========================================

export interface BackendProductionItem {
  date: string;
  production_ton: number;
  target_ton: number;
  fleet_oee_pct: number;
  trips_count: number;
  active_hours: number;
}

export interface BackendProductionResponse {
  period: string;
  days: number;
  source: string;
  total_production_ton: number;
  avg_fleet_oee_pct: number;
  achievement_pct: number;
  data: BackendProductionItem[];
}

export async function getAnalyticsProduction(
  period?: 'today' | 'week' | 'month'
): Promise<BackendProductionResponse> {
  const query = period ? `?period=${period}` : '';
  return apiGet<BackendProductionResponse>(`/api/analytics/production${query}`);
}

// ==========================================
// LLM Report API
// ==========================================

export async function generateLLMReport(payload: LLMReportPayload): Promise<LLMReportResponse> {
  return apiPost('/api/llm/report', payload);
}

// ==========================================
// Supabase Integration for LLM Report History
// ==========================================

export async function fetchReports(): Promise<ReportRow[]> {
  const { supabase } = await import('./supabase');

  const { data, error } = await supabase
    .from('ai_decisions')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function saveReport(reportData: {
  tanggal: string;
  shift: string;
  status: string;
  summary: string;
  executive_summary: string;
  report: object;
}): Promise<ReportRow> {
  const { supabase } = await import('./supabase');

  const { data, error } = await supabase
    .from('ai_decisions')
    .insert({
      timestamp: new Date().toISOString(),
      decision_text: reportData.executive_summary,
      priority_level: 'INFO',
      triggered_agents: ['LLM Report'],
      fleet_summary: JSON.stringify(reportData.report),
      safety_summary: JSON.stringify(reportData.report),
      emission_summary: JSON.stringify(reportData.report),
      reclamation_summary: JSON.stringify(reportData.report),
      scenario: 'manual_report',
      llm_engine: 'mistral-7b',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchReclamationZones(): Promise<ReclamationZoneRow[]> {
  const { supabase } = await import('./supabase');

  const { data, error } = await supabase
    .from('reclamation_zones')
    .select('*');

  if (error) throw error;
  return data || [];
}

// ==========================================
// Scenario API
// ==========================================

export async function postScenario(scenario: string): Promise<any> {
  return apiPost(`/api/scenario/${scenario}`, {});
}

// ==========================================
// Health Check
// ==========================================

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

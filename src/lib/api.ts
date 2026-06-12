/**
 * API Service untuk MineOS Backend
 * Base URL: http://[IP_LAPTOP_KAMU]:8000
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

export interface LLMReport {
  scenario: 'normal' | 'critical' | 'warning';
  timestamp: string;
  report: string;
  recommendations?: string[];
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

export interface AnalyticsParams {
  period?: 'day' | 'week' | 'month' | 'year';
}

export async function getAnalyticsProduction(
  params: AnalyticsParams = {}
): Promise<Production> {
  const query = new URLSearchParams();
  if (params.period) {
    query.append('period', params.period);
  }
  const endpoint = `/api/analytics/production${query.toString() ? '?' + query.toString() : ''}`;
  const response = await apiGet<{ data: Production }>(endpoint);
  return response.data;
}

// ==========================================
// LLM Report API
// ==========================================

export async function postLLMReport(
  scenario: 'normal' | 'critical' | 'warning'
): Promise<LLMReport> {
  return apiPost('/api/llm/report', {
    scenario,
  });
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

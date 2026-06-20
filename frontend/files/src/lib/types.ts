// Tipe data untuk Lead
export interface Lead {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Untuk field tambahan dari backend
}

// Tipe response untuk list leads
export interface LeadsResponse {
  success: boolean;
  data: Lead[];
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// Tipe response untuk single lead
export interface LeadResponse {
  success: boolean;
  data: Lead;
  message?: string;
}

// Tipe untuk API error
export interface ApiError {
  success: false;
  message: string;
  error?: any;
}

// Tipe untuk create/update lead request
export interface CreateLeadRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  [key: string]: any;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {}

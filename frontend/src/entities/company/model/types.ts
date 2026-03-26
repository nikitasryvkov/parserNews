export type CompaniesPool = 'medtech' | 'edtech';

export interface Company {
  id: number;
  position: number | string;
  company_name: string;
  company_url: string | null;
  ceo: string | null;
  segment: string | null;
  revenue_2024_q2: string | null;
  revenue_2025_q3: string | null;
  dynamics: string | null;
}

export interface CompaniesResponse {
  total: number;
  page: number;
  limit: number;
  companies: Company[];
}

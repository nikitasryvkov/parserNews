import type { DeletedCountResponse, IdResponse } from '../../../shared/api/http/contracts';
import { requestJson } from '../../../shared/api/http/client';
import type { CompaniesPool, CompaniesResponse } from '../model/types';

export function fetchCompanies(
  page: number,
  limit: number,
  search: string,
  pool: CompaniesPool,
): Promise<CompaniesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set('search', search);
  }

  const path = pool === 'edtech' ? '/companies/edtech' : '/companies';
  return requestJson<CompaniesResponse>(`${path}?${params.toString()}`);
}

export function deleteAllCompanies(pool: CompaniesPool): Promise<DeletedCountResponse> {
  const path = pool === 'edtech' ? '/companies/edtech' : '/companies';

  return requestJson<DeletedCountResponse>(path, {
    method: 'DELETE',
  });
}

export function deleteCompany(id: number, pool: CompaniesPool): Promise<IdResponse<number>> {
  const path = pool === 'edtech' ? `/companies/edtech/${id}` : `/companies/${id}`;

  return requestJson<IdResponse<number>>(path, {
    method: 'DELETE',
  });
}

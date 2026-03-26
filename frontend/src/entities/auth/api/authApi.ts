import { requestJson } from '../../../shared/api/http/client';
import type {
  AppRole,
  AuthConfigResponse,
  AuthMeResponse,
  ManagedUsersResponse,
  UpdateManagedUserRolesResponse,
} from '../model/types';

export function fetchAuthConfig(): Promise<AuthConfigResponse> {
  return requestJson<AuthConfigResponse>('/auth/config');
}

export function fetchCurrentUser(): Promise<AuthMeResponse> {
  return requestJson<AuthMeResponse>('/auth/me');
}

export function fetchManagedUsers(page: number, limit: number, search: string): Promise<ManagedUsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.set('search', search);
  }

  return requestJson<ManagedUsersResponse>(`/auth/users?${params.toString()}`);
}

export function updateManagedUserRoles(userId: string, appRoles: AppRole[]): Promise<UpdateManagedUserRolesResponse> {
  return requestJson<UpdateManagedUserRolesResponse>(`/auth/users/${encodeURIComponent(userId)}/roles`, {
    method: 'PUT',
    body: { appRoles },
  });
}

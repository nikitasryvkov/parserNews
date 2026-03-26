import { randomUUID } from 'crypto';
import { getConfig } from '../config/index.js';
import { createChildLogger } from '../lib/logger.js';
import { APP_ROLES, isAppRole, type AppRole } from './rbac.js';
import type { RoleManagedUser } from './types.js';

const log = createChildLogger('auth:keycloak-admin');

export class KeycloakAdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'KeycloakAdminError';
    this.statusCode = statusCode;
  }
}

interface CachedAdminToken {
  accessToken: string;
  expiresAt: number;
}

interface KeycloakRoleRepresentation {
  id: string;
  name: string;
  description?: string;
}

interface KeycloakUserRepresentation {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
}

let cachedAdminToken: CachedAdminToken | null = null;
const roleCache = new Map<AppRole, KeycloakRoleRepresentation>();

function getAdminBaseUrl() {
  const { auth } = getConfig();
  return `${auth.keycloak.baseUrl}/admin/realms/${auth.keycloak.realm}`;
}

function isRoleManagementConfigured(): boolean {
  const { auth } = getConfig();

  return Boolean(auth.keycloak.adminClientId && auth.keycloak.adminClientSecret);
}

async function requestAdminAccessToken(): Promise<string> {
  const { auth } = getConfig();

  if (!isRoleManagementConfigured()) {
    throw new Error('Keycloak admin client is not configured');
  }

  if (cachedAdminToken && cachedAdminToken.expiresAt > Date.now() + 10_000) {
    return cachedAdminToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: auth.keycloak.adminClientId,
    client_secret: auth.keycloak.adminClientSecret,
  });

  const response = await fetch(`${auth.keycloak.issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    log.error({ status: response.status, text }, 'Failed to get Keycloak admin token');

    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new KeycloakAdminError(
        'Не удалось получить сервисный токен Keycloak. Проверьте parser-news-admin client id/secret и включённый Client authentication.',
      );
    }

    throw new KeycloakAdminError(`Keycloak не выдал сервисный токен Admin API: HTTP ${response.status}`);
  }

  const payload = await response.json() as { access_token: string; expires_in: number };
  cachedAdminToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  return payload.access_token;
}

async function keycloakAdminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await requestAdminAccessToken();

  const response = await fetch(`${getAdminBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    log.error({ path, status: response.status, text }, 'Keycloak admin API request failed');

    if (response.status === 401) {
      throw new KeycloakAdminError(
        'Keycloak отверг сервисный токен Admin API. Проверьте client secret у parser-news-admin.',
      );
    }

    if (response.status === 403) {
      throw new KeycloakAdminError(
        'У service account клиента parser-news-admin нет прав на Keycloak Admin API. Выдайте realm-management -> realm-admin.',
        403,
      );
    }

    throw new KeycloakAdminError(`Keycloak Admin API вернул ошибку HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function getRoleRepresentation(roleName: AppRole): Promise<KeycloakRoleRepresentation> {
  const cached = roleCache.get(roleName);
  if (cached) return cached;

  const role = await keycloakAdminRequest<KeycloakRoleRepresentation>(`/roles/${encodeURIComponent(roleName)}`);
  roleCache.set(roleName, role);
  return role;
}

async function getUsersCount(search = ''): Promise<number> {
  const query = new URLSearchParams();

  if (search.trim()) {
    query.set('search', search.trim());
  }

  const response = await keycloakAdminRequest<number | { count?: number }>(`/users/count${query.size ? `?${query.toString()}` : ''}`);

  if (typeof response === 'number') {
    return response;
  }

  return Number(response.count ?? 0);
}

async function getUserById(userId: string): Promise<KeycloakUserRepresentation> {
  return keycloakAdminRequest<KeycloakUserRepresentation>(`/users/${encodeURIComponent(userId)}`);
}

async function getUserRealmRoles(userId: string): Promise<string[]> {
  const roles = await keycloakAdminRequest<KeycloakRoleRepresentation[]>(`/users/${encodeURIComponent(userId)}/role-mappings/realm`);
  return roles.map((role) => role.name).filter((role): role is string => Boolean(role));
}

function mapManagedUser(user: KeycloakUserRepresentation, realmRoles: string[]): RoleManagedUser {
  return {
    id: user.id || randomUUID(),
    username: user.username || user.email || 'unknown',
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    enabled: Boolean(user.enabled),
    appRoles: realmRoles.filter(isAppRole),
    realmRoles,
  };
}

export function isRoleManagementEnabled(): boolean {
  return isRoleManagementConfigured();
}

export async function listManagedUsers(search = '', first = 0, max = 50): Promise<{ total: number; users: RoleManagedUser[] }> {
  const query = new URLSearchParams({
    first: String(first),
    max: String(max),
    briefRepresentation: 'true',
  });

  if (search.trim()) {
    query.set('search', search.trim());
  }

  const [total, users] = await Promise.all([
    getUsersCount(search),
    keycloakAdminRequest<KeycloakUserRepresentation[]>(`/users?${query.toString()}`),
  ]);
  const mappedUsers = await Promise.all(
    users.map(async (user) => mapManagedUser(user, await getUserRealmRoles(String(user.id)))),
  );

  return {
    total,
    users: mappedUsers,
  };
}

export async function replaceUserAppRoles(userId: string, nextRoles: AppRole[]): Promise<RoleManagedUser> {
  const currentRealmRoles = await getUserRealmRoles(userId);
  const currentAppRoles = currentRealmRoles.filter(isAppRole);

  const rolesToRemove = currentAppRoles.filter((role) => !nextRoles.includes(role));
  const rolesToAdd = nextRoles.filter((role) => !currentAppRoles.includes(role));

  if (rolesToRemove.length) {
    const payload = await Promise.all(rolesToRemove.map((role) => getRoleRepresentation(role)));
    await keycloakAdminRequest<void>(`/users/${encodeURIComponent(userId)}/role-mappings/realm`, {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  }

  if (rolesToAdd.length) {
    const payload = await Promise.all(rolesToAdd.map((role) => getRoleRepresentation(role)));
    await keycloakAdminRequest<void>(`/users/${encodeURIComponent(userId)}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  const user = await getUserById(userId);
  const updatedRealmRoles = await getUserRealmRoles(userId);

  return mapManagedUser(user ?? { id: userId, username: userId, enabled: true }, updatedRealmRoles);
}

export { APP_ROLES };

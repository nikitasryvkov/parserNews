import type { JWTPayload } from 'jose';
import type { AppPermission, AppRole } from './rbac.js';

export type AuthProvider = 'api_key' | 'keycloak';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  realmRoles: string[];
  clientRoles: string[];
  appRoles: AppRole[];
  permissions: AppPermission[];
}

export interface AuthContext {
  provider: AuthProvider;
  token: string | null;
  claims: JWTPayload | null;
  user: AuthUser;
}

export interface AuthConfigResponse {
  provider: AuthProvider;
  authRequired: boolean;
  keycloak:
    | {
        url: string;
        realm: string;
        clientId: string;
      }
    | null;
  roles: Array<{
    name: AppRole;
    label: string;
    description: string;
    permissions: AppPermission[];
  }>;
  roleManagementEnabled: boolean;
}

export interface AuthMeResponse {
  ok: true;
  user: AuthUser;
  provider: AuthProvider;
}

export interface RoleManagedUser {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  enabled: boolean;
  appRoles: AppRole[];
  realmRoles: string[];
}

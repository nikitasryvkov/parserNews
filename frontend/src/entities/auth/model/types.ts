export type AuthProvider = 'api_key' | 'keycloak';

export const APP_ROLES = ['admin', 'operator', 'viewer'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  'dashboard.view',
  'articles.view',
  'articles.delete',
  'companies.view',
  'companies.delete',
  'tags.view',
  'tags.manage',
  'queues.view',
  'settings.view',
  'settings.manage',
  'vpo.view',
  'vpo.upload',
  'vpo.delete',
  'profile.view',
  'access.users.view',
  'access.roles.manage',
  'parser.run',
] as const;
export type AppPermission = (typeof APP_PERMISSIONS)[number];

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

export interface RoleDescriptor {
  name: AppRole;
  label: string;
  description: string;
  permissions: AppPermission[];
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
  roles: RoleDescriptor[];
  roleManagementEnabled: boolean;
}

export interface AuthMeResponse {
  ok: true;
  provider: AuthProvider;
  user: AuthUser;
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

export interface ManagedUsersResponse {
  ok: true;
  total: number;
  page: number;
  limit: number;
  roles: AppRole[];
  users: RoleManagedUser[];
}

export interface UpdateManagedUserRolesResponse {
  ok: true;
  user: RoleManagedUser;
}

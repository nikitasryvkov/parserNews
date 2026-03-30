export const APP_ROLES = ['admin', 'operator', 'viewer'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  'dashboard.view',
  'articles.view',
  'articles.manage',
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

export interface RoleDescriptor {
  name: AppRole;
  label: string;
  description: string;
  permissions: AppPermission[];
}

const ROLE_PERMISSION_MAP: Record<AppRole, AppPermission[]> = {
  admin: [...APP_PERMISSIONS],
  operator: [
    'dashboard.view',
    'articles.view',
    'articles.manage',
    'companies.view',
    'tags.view',
    'tags.manage',
    'queues.view',
    'settings.view',
    'settings.manage',
    'vpo.view',
    'vpo.upload',
    'profile.view',
    'parser.run',
  ],
  viewer: [
    'dashboard.view',
    'articles.view',
    'companies.view',
    'queues.view',
    'vpo.view',
    'profile.view',
  ],
};

const ROLE_METADATA: Record<AppRole, Omit<RoleDescriptor, 'permissions'>> = {
  admin: {
    name: 'admin',
    label: 'Admin',
    description: 'Полный доступ к данным, настройкам, удалению контента и управлению ролями.',
  },
  operator: {
    name: 'operator',
    label: 'Operator',
    description: 'Рабочий доступ к парсингу, тегам, настройкам и загрузке ВПО без destructive admin-операций.',
  },
  viewer: {
    name: 'viewer',
    label: 'Viewer',
    description: 'Просмотр данных и очередей без изменений состояния системы.',
  },
};

export function isAppRole(value: string): value is AppRole {
  return APP_ROLES.includes(value as AppRole);
}

export function getRoleDescriptors(): RoleDescriptor[] {
  return APP_ROLES.map((role) => ({
    ...ROLE_METADATA[role],
    permissions: [...ROLE_PERMISSION_MAP[role]],
  }));
}

export function getPermissionsForRoles(roles: readonly string[]): AppPermission[] {
  const permissions = new Set<AppPermission>();

  roles.forEach((role) => {
    if (!isAppRole(role)) return;

    ROLE_PERMISSION_MAP[role].forEach((permission) => permissions.add(permission));
  });

  return [...permissions];
}

export function hasRole(roles: readonly string[], expected: AppRole): boolean {
  return roles.includes(expected);
}

export function hasAnyRole(roles: readonly string[], expectedRoles: readonly AppRole[]): boolean {
  return expectedRoles.some((role) => hasRole(roles, role));
}

export function hasPermission(permissions: readonly string[], permission: AppPermission): boolean {
  return permissions.includes(permission);
}

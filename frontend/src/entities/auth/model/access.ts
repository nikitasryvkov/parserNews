import type { AppPermission, AppRole } from './types';

export function hasPermission(permissions: readonly string[], expected: AppPermission): boolean {
  return permissions.includes(expected);
}

export function hasRole(roles: readonly string[], expected: AppRole): boolean {
  return roles.includes(expected);
}

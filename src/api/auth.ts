import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { getConfig } from '../config/index.js';
import { createChildLogger } from '../lib/logger.js';
import { isRoleManagementEnabled } from '../auth/admin.js';
import { handleKeycloakVerificationError, verifyKeycloakAccessToken, describeKeycloakPublicConfig } from '../auth/keycloak.js';
import {
  APP_ROLES,
  getPermissionsForRoles,
  getRoleDescriptors,
  hasAnyRole,
  hasPermission,
  type AppPermission,
  type AppRole,
} from '../auth/rbac.js';
import type { AuthConfigResponse, AuthContext } from '../auth/types.js';

const log = createChildLogger('auth');

const PUBLIC_AUTH_PATHS = new Set(['/health', '/auth/config', '/openapi.json']);

function isPublicApiRoute(req: Request): boolean {
  return req.method === 'GET' && PUBLIC_AUTH_PATHS.has(req.path);
}

function isAuthRequired(): boolean {
  const { auth } = getConfig();
  return auth.provider === 'keycloak' || Boolean(auth.apiKey.trim());
}

function buildServiceAccountContext(options: {
  token: string | null;
  id: string;
  username: string;
  displayName: string;
  appRoles?: AppRole[];
}): AuthContext {
  const appRoles = options.appRoles ?? ['admin'];

  return {
    provider: 'api_key',
    token: options.token,
    claims: null,
    user: {
      id: options.id,
      username: options.username,
      email: null,
      firstName: null,
      lastName: null,
      displayName: options.displayName,
      realmRoles: [...appRoles],
      clientRoles: [],
      appRoles,
      permissions: getPermissionsForRoles(appRoles),
    },
  };
}

function verifyApiKeyToken(token: string): AuthContext | null {
  const { auth } = getConfig();
  const apiKey = auth.apiKey.trim();

  if (!apiKey) {
    return null;
  }

  const expected = Buffer.from(apiKey);
  const actual = Buffer.from(token);
  const isValid = actual.length === expected.length && timingSafeEqual(actual, expected);

  return isValid
    ? buildServiceAccountContext({
        token,
        id: 'service-api-key',
        username: 'service-api-key',
        displayName: 'Service API key',
      })
    : null;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isPublicApiRoute(req)) {
    next();
    return;
  }

  const { auth } = getConfig();

  if (auth.provider === 'api_key') {
    if (!auth.apiKey.trim()) {
      req.auth = buildServiceAccountContext({
        token: null,
        id: 'open-access',
        username: 'open-access',
        displayName: 'Open access mode',
      });
      next();
      return;
    }

    const token = extractBearerToken(req);

    if (!token) {
      log.warn({ ip: req.ip, path: req.path }, 'Missing or malformed Authorization header');
      res.status(401).json({ error: 'Authorization required. Use: Authorization: Bearer <token>' });
      return;
    }

    const context = verifyApiKeyToken(token);

    if (!context) {
      log.warn({ ip: req.ip, path: req.path }, 'Invalid API key');
      res.status(403).json({ error: 'Invalid API key' });
      return;
    }

    req.auth = context;
    next();
    return;
  }

  const token = extractBearerToken(req);

  if (!token) {
    log.warn({ ip: req.ip, path: req.path }, 'Missing or malformed Authorization header');
    res.status(401).json({ error: 'Authorization required. Use: Authorization: Bearer <token>' });
    return;
  }

  try {
    req.auth = await verifyKeycloakAccessToken(token);
    next();
  } catch (err) {
    const message = handleKeycloakVerificationError(err);
    res.status(403).json({ error: message });
  }
}

export function requireRoles(...roles: AppRole[]): RequestHandler {
  return (req, res, next) => {
    const assignedRoles = req.auth?.user.appRoles ?? [];

    if (!hasAnyRole(assignedRoles, roles)) {
      res.status(403).json({
        error: `Insufficient role. Required: ${roles.join(', ')}`,
        requiredRoles: roles,
        assignedRoles,
      });
      return;
    }

    next();
  };
}

export function requirePermissions(...permissions: AppPermission[]): RequestHandler {
  return (req, res, next) => {
    const assignedPermissions = req.auth?.user.permissions ?? [];
    const missingPermissions = permissions.filter((permission) => !hasPermission(assignedPermissions, permission));

    if (missingPermissions.length) {
      res.status(403).json({
        error: `Insufficient permissions. Required: ${permissions.join(', ')}`,
        requiredPermissions: permissions,
        assignedPermissions,
      });
      return;
    }

    next();
  };
}

export function getPublicAuthConfig(): AuthConfigResponse {
  const { auth } = getConfig();

  return {
    provider: auth.provider,
    authRequired: isAuthRequired(),
    keycloak: auth.provider === 'keycloak' ? describeKeycloakPublicConfig() : null,
    roles: getRoleDescriptors(),
    roleManagementEnabled: auth.provider === 'keycloak' && isRoleManagementEnabled(),
  };
}

export function getAllAppRoles(): readonly AppRole[] {
  return APP_ROLES;
}

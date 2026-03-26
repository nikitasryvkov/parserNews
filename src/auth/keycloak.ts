import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { getConfig } from '../config/index.js';
import { createChildLogger } from '../lib/logger.js';
import { APP_ROLES, getPermissionsForRoles, type AppRole } from './rbac.js';
import type { AuthContext, AuthUser } from './types.js';

const log = createChildLogger('auth:keycloak');

type KeycloakJwtPayload = JWTPayload & {
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;

  const { auth } = getConfig();
  jwks = createRemoteJWKSet(new URL(`${auth.keycloak.issuer}/protocol/openid-connect/certs`));
  return jwks;
}

function toAppRoles(realmRoles: readonly string[]): AppRole[] {
  return APP_ROLES.filter((role) => realmRoles.includes(role));
}

function buildAuthUser(payload: KeycloakJwtPayload): AuthUser {
  const { auth } = getConfig();
  const realmRoles = payload.realm_access?.roles ?? [];
  const clientRoles = payload.resource_access?.[auth.keycloak.clientId]?.roles ?? [];
  const appRoles = toAppRoles(realmRoles);
  const permissions = getPermissionsForRoles(appRoles);

  return {
    id: payload.sub || payload.preferred_username || 'unknown',
    username: payload.preferred_username || payload.email || payload.sub || 'unknown',
    email: payload.email ?? null,
    firstName: payload.given_name ?? null,
    lastName: payload.family_name ?? null,
    displayName:
      payload.name ||
      [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
      payload.preferred_username ||
      payload.email ||
      payload.sub ||
      'Unknown user',
    realmRoles: [...realmRoles],
    clientRoles: [...clientRoles],
    appRoles,
    permissions,
  };
}

function ensureTokenIsForClient(payload: KeycloakJwtPayload): void {
  const { auth } = getConfig();
  const clientId = auth.keycloak.clientId;
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  const hasClientAudience = audiences.includes(clientId);
  const hasAuthorizedParty = payload.azp === clientId;
  const hasClientResourceAccess = Boolean(payload.resource_access?.[clientId]);

  if (!hasClientAudience && !hasAuthorizedParty && !hasClientResourceAccess) {
    throw new Error(`Token is not intended for client "${clientId}"`);
  }
}

export async function verifyKeycloakAccessToken(token: string): Promise<AuthContext> {
  const { auth } = getConfig();
  const payloadVerification = await jwtVerify(token, getJwks(), {
    issuer: auth.keycloak.issuer,
  });

  const payload = payloadVerification.payload as KeycloakJwtPayload;
  ensureTokenIsForClient(payload);

  return {
    provider: 'keycloak',
    token,
    claims: payload,
    user: buildAuthUser(payload),
  };
}

export function describeKeycloakPublicConfig() {
  const { auth } = getConfig();

  return {
    url: auth.keycloak.baseUrl,
    realm: auth.keycloak.realm,
    clientId: auth.keycloak.clientId,
  };
}

export function handleKeycloakVerificationError(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Keycloak token verification failed';
  log.warn({ err }, 'Keycloak access token rejected');
  return message;
}

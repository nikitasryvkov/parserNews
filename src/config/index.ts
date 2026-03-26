/**
 * Конфигурация модуля (БД, Redis, сервер).
 * По умолчанию читается из process.env; внешняя система может переопределить
 * через initConfig() до создания воркеров и запуска API.
 */
import type { Knex } from 'knex';

export interface ConfigInput {
  port?: number;
  auth?: {
    provider?: 'api_key' | 'keycloak';
  };
  db?: {
    host?: string;
    port?: number;
    name?: string;
    user?: string;
    password?: string;
  };
  redis?: {
    host?: string;
    port?: number;
    password?: string;
  };
}

export interface Config {
  port: number;
  auth: {
    provider: 'api_key' | 'keycloak';
    apiKey: string;
    keycloak: {
      baseUrl: string;
      realm: string;
      clientId: string;
      issuer: string;
      adminClientId: string;
      adminClientSecret: string;
    };
  };
  db: { host: string; port: number; name: string; user: string; password: string };
  redis: { host: string; port: number; password: string | undefined };
}

const DEFAULT_DB_PASSWORD = 'postgres';
const DEFAULT_PORT = 3000;
const DEFAULT_DB_PORT = 5432;
const DEFAULT_REDIS_PORT = 6379;
const WEAK_SECRETS = new Set([
  '',
  'admin',
  'change-me',
  'changeme',
  'default',
  'parser-news',
  'password',
  'postgres',
  'secret',
  'test',
]);

function parseIntOr(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeSecret(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isProduction(): boolean {
  return normalizeSecret(process.env.NODE_ENV).toLowerCase() === 'production';
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
}

function isWeakSecret(value: string, minLength: number): boolean {
  const normalized = normalizeSecret(value);
  if (normalized.length < minLength) return true;
  return WEAK_SECRETS.has(normalized.toLowerCase());
}

function resolveAuthProvider(raw: string | undefined): 'api_key' | 'keycloak' {
  const normalized = normalizeSecret(raw).toLowerCase();
  if (normalized === 'keycloak') return 'keycloak';
  if (normalized === 'api_key') return 'api_key';

  const hasKeycloakConfig =
    Boolean(normalizeSecret(process.env.KEYCLOAK_URL)) &&
    Boolean(normalizeSecret(process.env.KEYCLOAK_REALM)) &&
    Boolean(normalizeSecret(process.env.KEYCLOAK_CLIENT_ID));

  return hasKeycloakConfig ? 'keycloak' : 'api_key';
}

function buildConfig(overrides?: ConfigInput): Config {
  const authProvider = overrides?.auth?.provider ?? resolveAuthProvider(process.env.AUTH_PROVIDER);
  const keycloakBaseUrl = normalizeSecret(process.env.KEYCLOAK_URL).replace(/\/+$/, '');
  const keycloakRealm = normalizeSecret(process.env.KEYCLOAK_REALM);
  const keycloakClientId = normalizeSecret(process.env.KEYCLOAK_CLIENT_ID);

  return {
    port: overrides?.port ?? parseIntOr(process.env.PORT, DEFAULT_PORT),
    auth: {
      provider: authProvider,
      apiKey: normalizeSecret(process.env.API_KEY),
      keycloak: {
        baseUrl: keycloakBaseUrl,
        realm: keycloakRealm,
        clientId: keycloakClientId,
        issuer:
          keycloakBaseUrl && keycloakRealm
            ? `${keycloakBaseUrl}/realms/${keycloakRealm}`
            : '',
        adminClientId: normalizeSecret(process.env.KEYCLOAK_ADMIN_CLIENT_ID),
        adminClientSecret: normalizeSecret(process.env.KEYCLOAK_ADMIN_CLIENT_SECRET),
      },
    },
    db: {
      host: overrides?.db?.host ?? process.env.DB_HOST ?? 'localhost',
      port: overrides?.db?.port ?? parseIntOr(process.env.DB_PORT, DEFAULT_DB_PORT),
      name: overrides?.db?.name ?? process.env.DB_NAME ?? 'parser_news',
      user: overrides?.db?.user ?? process.env.DB_USER ?? 'postgres',
      password: overrides?.db?.password ?? process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD,
    },
    redis: {
      host: overrides?.redis?.host ?? process.env.REDIS_HOST ?? 'localhost',
      port: overrides?.redis?.port ?? parseIntOr(process.env.REDIS_PORT, DEFAULT_REDIS_PORT),
      password: normalizeSecret(overrides?.redis?.password ?? process.env.REDIS_PASSWORD) || undefined,
    },
  };
}

let _config: Config = buildConfig();

/** Переопределить конфигурацию до инициализации воркеров и API */
export function initConfig(overrides: ConfigInput): void {
  _config = buildConfig(overrides);
}

export function getConfig(): Config {
  return _config;
}

/**
 * Проверяет конфиг при старте.
 * В production выбрасывает ошибку, если критические параметры
 * остались с дефолтными небезопасными значениями.
 */
export function validateConfig(): void {
  const { port, auth, db, redis } = _config;
  const errors: string[] = [];
  const apiKey = normalizeSecret(auth.apiKey);
  const dbPassword = normalizeSecret(db.password);

  if (!isValidPort(port)) errors.push('PORT must be an integer between 1 and 65535');
  if (!db.host) errors.push('DB_HOST is not set');
  if (!isValidPort(db.port)) errors.push('DB_PORT must be an integer between 1 and 65535');
  if (!db.name) errors.push('DB_NAME is not set');
  if (!db.user) errors.push('DB_USER is not set');
  if (!dbPassword) errors.push('DB_PASSWORD is not set');
  if (!redis.host) errors.push('REDIS_HOST is not set');
  if (!isValidPort(redis.port)) errors.push('REDIS_PORT must be an integer between 1 and 65535');

  if (auth.provider === 'keycloak') {
    if (!auth.keycloak.baseUrl) errors.push('KEYCLOAK_URL is not set');
    if (!auth.keycloak.realm) errors.push('KEYCLOAK_REALM is not set');
    if (!auth.keycloak.clientId) errors.push('KEYCLOAK_CLIENT_ID is not set');
  }

  if (isProduction()) {
    if (auth.provider === 'api_key' && isWeakSecret(apiKey, 16)) {
      errors.push('API_KEY must be set to a strong value in production when AUTH_PROVIDER=api_key');
    }
    if (auth.provider === 'keycloak') {
      if (!auth.keycloak.adminClientId) {
        errors.push('KEYCLOAK_ADMIN_CLIENT_ID must be set in production for role management');
      }
      if (isWeakSecret(auth.keycloak.adminClientSecret, 16)) {
        errors.push('KEYCLOAK_ADMIN_CLIENT_SECRET must be a strong secret in production');
      }
      if (!auth.keycloak.issuer) {
        errors.push('KEYCLOAK issuer could not be derived from KEYCLOAK_URL and KEYCLOAK_REALM');
      }
    }
    if (dbPassword.toLowerCase() === DEFAULT_DB_PASSWORD || isWeakSecret(dbPassword, 12)) {
      errors.push('DB_PASSWORD must be changed from the default and be at least 12 chars in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`[Config] Invalid configuration:\n  ${errors.join('\n  ')}`);
  }
}

/** Конфиг для Knex (client postgres) */
export function getKnexConfig(): Knex.Config {
  const { db } = getConfig();
  return {
    client: 'pg',
    connection: {
      host: db.host,
      port: db.port,
      database: db.name,
      user: db.user,
      password: db.password,
      // Меньше «тихих» обрывов при долгом простое NAT / Docker-сети
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    },
    pool: {
      min: 1,
      max: parseIntOr(process.env.DB_POOL_MAX, 10),
      acquireTimeoutMillis: 30_000,
      // Слишком короткий idle усиливает churn соединений; 30s — разумный компромисс
      idleTimeoutMillis: parseIntOr(process.env.DB_POOL_IDLE_MS, 30_000),
    },
    migrations: {
      directory: './migrations',
    },
  };
}

/** Опции подключения Redis для BullMQ */
export function getRedisOptions() {
  const { redis } = getConfig();
  return {
    host: redis.host,
    port: redis.port,
    password: redis.password || undefined,
  };
}

/**
 * Конфигурация модуля (БД, Redis, сервер).
 * По умолчанию читается из process.env; внешняя система может переопределить
 * через initConfig() до создания воркеров и запуска API.
 */
import type { Knex } from 'knex';

export interface ConfigInput {
  port?: number;
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

function buildConfig(overrides?: ConfigInput): Config {
  return {
    port: overrides?.port ?? parseIntOr(process.env.PORT, DEFAULT_PORT),
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
  const { port, db, redis } = _config;
  const errors: string[] = [];
  const apiKey = normalizeSecret(process.env.API_KEY);
  const dbPassword = normalizeSecret(db.password);

  if (!isValidPort(port)) errors.push('PORT must be an integer between 1 and 65535');
  if (!db.host) errors.push('DB_HOST is not set');
  if (!isValidPort(db.port)) errors.push('DB_PORT must be an integer between 1 and 65535');
  if (!db.name) errors.push('DB_NAME is not set');
  if (!db.user) errors.push('DB_USER is not set');
  if (!dbPassword) errors.push('DB_PASSWORD is not set');
  if (!redis.host) errors.push('REDIS_HOST is not set');
  if (!isValidPort(redis.port)) errors.push('REDIS_PORT must be an integer between 1 and 65535');

  if (isProduction()) {
    if (isWeakSecret(apiKey, 16)) {
      errors.push('API_KEY must be set to a strong value in production (at least 16 chars, not a default secret)');
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

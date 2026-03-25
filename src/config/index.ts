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

function buildConfig(overrides?: ConfigInput): Config {
  return {
    port: overrides?.port ?? parseInt(process.env.PORT ?? '3000', 10),
    db: {
      host: overrides?.db?.host ?? process.env.DB_HOST ?? 'localhost',
      port: overrides?.db?.port ?? parseInt(process.env.DB_PORT ?? '5432', 10),
      name: overrides?.db?.name ?? process.env.DB_NAME ?? 'parser_news',
      user: overrides?.db?.user ?? process.env.DB_USER ?? 'postgres',
      password: overrides?.db?.password ?? process.env.DB_PASSWORD ?? 'postgres',
    },
    redis: {
      host: overrides?.redis?.host ?? process.env.REDIS_HOST ?? 'localhost',
      port: overrides?.redis?.port ?? parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: overrides?.redis?.password ?? process.env.REDIS_PASSWORD ?? undefined,
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
  const { db, redis } = _config;
  const errors: string[] = [];

  if (!db.host) errors.push('DB_HOST is not set');
  if (!db.name) errors.push('DB_NAME is not set');
  if (!db.user) errors.push('DB_USER is not set');
  if (!db.password) errors.push('DB_PASSWORD is not set');
  if (!redis.host) errors.push('REDIS_HOST is not set');

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
    },
    pool: {
      min: 1,
      max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      acquireTimeoutMillis: 30_000,
      idleTimeoutMillis: 10_000,
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

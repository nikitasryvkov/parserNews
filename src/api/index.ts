import { join } from 'path';
import { createHash } from 'crypto';
import express from 'express';
import helmet from 'helmet';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import routes from './routes.js';
import { authMiddleware } from './auth.js';
import { getConfig } from '../config/index.js';
import { createChildLogger } from '../lib/logger.js';
import type { Request, Response, NextFunction } from 'express';

const log = createChildLogger('api');
const READ_RATE_LIMIT_EXCLUDE = new Set(['/api/health', '/api/auth/config', '/api/auth/me']);
const WRITE_RATE_LIMIT_EXCLUDE = new Set(['/api/health', '/api/auth/config']);
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function resolveTrustProxySetting(raw: string | undefined): boolean | number | string {
  const normalized = raw?.trim().toLowerCase() ?? '';

  if (!normalized) {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'off') {
    return false;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'on') {
    return 1;
  }

  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isFinite(asNumber) && asNumber >= 1) {
    return asNumber;
  }

  return raw ?? false;
}

function hashRateLimitToken(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 24);
}

function buildRateLimitKey(req: Request): string {
  const auth = req.auth;

  if (auth?.provider === 'keycloak' && auth.user.id) {
    return `user:${auth.user.id}`;
  }

  if (auth?.provider === 'api_key' && auth.token) {
    return `api-key:${hashRateLimitToken(auth.token)}`;
  }

  return `ip:${ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? '')}`;
}

function logRateLimitHit(req: Request, _res: Response): void {
  log.warn(
    {
      path: req.originalUrl,
      method: req.method,
      key: buildRateLimitKey(req),
      ip: req.ip,
      userId: req.auth?.user.id ?? null,
      provider: req.auth?.provider ?? null,
    },
    'API rate limit exceeded',
  );
}

export function createApp(): express.Express {
  const app = express();
  const trustProxy = resolveTrustProxySetting(process.env.TRUST_PROXY);

  app.set('trust proxy', trustProxy);

  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(express.json({ limit: '2mb' }));

  app.use(express.static(join(process.cwd(), 'public')));

  const readApiLimiter = rateLimit({
    windowMs: 60_000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildRateLimitKey,
    skip: (req) => !READ_METHODS.has(req.method) || READ_RATE_LIMIT_EXCLUDE.has(req.originalUrl),
    handler: (req, res, _next, options) => {
      logRateLimitHit(req, res);
      res.status(options.statusCode).json({ error: 'Too many requests, please try again later' });
    },
  });

  const writeApiLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildRateLimitKey,
    skip: (req) => READ_METHODS.has(req.method) || WRITE_RATE_LIMIT_EXCLUDE.has(req.originalUrl),
    handler: (req, res, _next, options) => {
      logRateLimitHit(req, res);
      res.status(options.statusCode).json({ error: 'Too many requests, please try again later' });
    },
  });

  app.use(
    '/api',
    authMiddleware,
    readApiLimiter,
    writeApiLimiter,
    routes,
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    log.error({ err }, 'Unhandled Express error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export async function startApi(): Promise<void> {
  const app = createApp();
  const { port } = getConfig();
  const host = process.env.LISTEN_HOST ?? '0.0.0.0';
  app.listen(port, host, () => {
    log.info({ port, host }, 'API listening');
  });
}

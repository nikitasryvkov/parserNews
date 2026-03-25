import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger('auth');

/**
 * Bearer-token auth middleware.
 * If API_KEY env is set, every request must include `Authorization: Bearer <token>`.
 * If API_KEY is not configured, auth is disabled (open access) — useful for local dev.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.API_KEY?.trim();

  if (req.method === 'GET' && req.path === '/health') {
    next();
    return;
  }

  if (!apiKey) {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    log.warn({ ip: req.ip, path: req.path }, 'Missing or malformed Authorization header');
    res.status(401).json({ error: 'Authorization required. Use: Authorization: Bearer <token>' });
    return;
  }

  const token = header.slice(7).trim();
  const expected = Buffer.from(apiKey);
  const actual = Buffer.from(token);
  const valid =
    actual.length === expected.length &&
    timingSafeEqual(actual, expected);

  if (!valid) {
    log.warn({ ip: req.ip, path: req.path }, 'Invalid API key');
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

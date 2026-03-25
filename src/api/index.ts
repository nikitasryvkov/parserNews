import { join } from 'path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';
import { authMiddleware } from './auth.js';
import { getConfig } from '../config/index.js';
import { createChildLogger } from '../lib/logger.js';
import type { Request, Response, NextFunction } from 'express';

const log = createChildLogger('api');

export function createApp(): express.Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(express.json({ limit: '2mb' }));

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    }),
  );

  app.use(express.static(join(process.cwd(), 'public')));

  app.use('/api', authMiddleware, routes);

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

import type { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async route handler so that rejected promises are forwarded
 * to Express error-handling middleware instead of silently crashing.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

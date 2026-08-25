import { Request, Response, NextFunction } from 'express';
import { runWithRequestCache } from './request-cache';

/**
 * Abre o escopo de memoização da requisição.
 *
 * Precisa ser o primeiro middleware registrado: guards, interceptors e
 * controllers só enxergam o armazenamento se rodarem dentro deste `run`.
 */
export function applyRequestCacheMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  runWithRequestCache(next);
}

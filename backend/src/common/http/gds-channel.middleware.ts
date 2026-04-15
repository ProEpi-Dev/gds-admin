import { Request, Response, NextFunction } from 'express';
import { resolveGdsChannel } from './gds-channel';

/** Define `req.gdsChannel` com base no header `x-gds-channel`. */
export function applyGdsChannelMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const rawHeader = req.headers['x-gds-channel'];
  const rawValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  (req as Request & { gdsChannel?: 'web' | 'app' }).gdsChannel =
    resolveGdsChannel(rawValue);
  next();
}

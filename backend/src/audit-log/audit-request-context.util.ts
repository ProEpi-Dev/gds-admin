import { Request } from 'express';
import { AuditRequestContext } from './audit-log.service';

export function buildAuditRequestContext(req: Request): AuditRequestContext {
  const channel = (req as Request & { gdsChannel?: 'web' | 'app' }).gdsChannel;
  const requestIdHeader = req.headers?.['x-request-id'];
  const requestId =
    typeof requestIdHeader === 'string'
      ? requestIdHeader
      : Array.isArray(requestIdHeader)
        ? requestIdHeader[0]
        : undefined;
  const userAgentHeader = req.headers?.['user-agent'];
  const userAgent =
    typeof userAgentHeader === 'string'
      ? userAgentHeader
      : Array.isArray(userAgentHeader)
        ? userAgentHeader[0]
        : undefined;

  return {
    requestId: requestId ?? ((req as Request & { id?: string }).id ?? null),
    channel: channel ?? 'api',
    ipAddress: req.ip ?? null,
    userAgent: userAgent ?? null,
  };
}

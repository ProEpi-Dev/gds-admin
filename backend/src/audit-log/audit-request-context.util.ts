import { Request } from 'express';
import { AuditRequestContext } from './audit-log.service';

function firstHeaderString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

export function buildAuditRequestContext(req: Request): AuditRequestContext {
  const channel = (req as Request & { gdsChannel?: 'web' | 'app' }).gdsChannel;
  const requestId = firstHeaderString(req.headers?.['x-request-id']);
  const userAgent = firstHeaderString(req.headers?.['user-agent']);

  return {
    requestId: requestId ?? ((req as Request & { id?: string }).id ?? null),
    channel: channel ?? 'api',
    ipAddress: req.ip ?? null,
    userAgent: userAgent ?? null,
  };
}

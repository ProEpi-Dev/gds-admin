import { buildAuditRequestContext } from './audit-request-context.util';

describe('buildAuditRequestContext', () => {
  it('usa channel api quando gdsChannel não está definido', () => {
    const req = { headers: {}, ip: '1.2.3.4' } as any;
    expect(buildAuditRequestContext(req)).toEqual({
      requestId: null,
      channel: 'api',
      ipAddress: '1.2.3.4',
      userAgent: null,
    });
  });

  it('usa gdsChannel quando presente', () => {
    const req = { headers: {}, ip: null, gdsChannel: 'web' } as any;
    expect(buildAuditRequestContext(req).channel).toBe('web');
  });

  it('lê x-request-id como string', () => {
    const req = {
      headers: { 'x-request-id': 'rid-1' },
      ip: null,
    } as any;
    expect(buildAuditRequestContext(req).requestId).toBe('rid-1');
  });

  it('lê primeiro valor quando x-request-id é array', () => {
    const req = {
      headers: { 'x-request-id': ['a', 'b'] },
      ip: null,
    } as any;
    expect(buildAuditRequestContext(req).requestId).toBe('a');
  });

  it('usa req.id quando não há cabeçalho x-request-id', () => {
    const req = { headers: {}, id: 'req-internal', ip: null } as any;
    expect(buildAuditRequestContext(req).requestId).toBe('req-internal');
  });

  it('lê user-agent como string', () => {
    const req = {
      headers: { 'user-agent': 'jest' },
      ip: null,
    } as any;
    expect(buildAuditRequestContext(req).userAgent).toBe('jest');
  });

  it('lê primeiro user-agent quando é array', () => {
    const req = {
      headers: { 'user-agent': ['ua1', 'ua2'] },
      ip: null,
    } as any;
    expect(buildAuditRequestContext(req).userAgent).toBe('ua1');
  });
});

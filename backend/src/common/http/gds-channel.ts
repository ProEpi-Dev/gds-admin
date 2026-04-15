/**
 * Normaliza o canal GDS a partir do header `x-gds-channel` (ou valor já colocado em `req.gdsChannel`).
 */
export function resolveGdsChannel(raw: unknown): 'web' | 'app' {
  const normalized = String(raw ?? '').toLowerCase();
  return normalized === 'web' ? 'web' : 'app';
}

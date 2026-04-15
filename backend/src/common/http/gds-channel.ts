/**
 * Normaliza o canal GDS a partir do header `x-gds-channel` (ou valor já colocado em `req.gdsChannel`).
 */
export function resolveGdsChannel(raw: unknown): 'web' | 'app' {
  if (raw === null || raw === undefined) {
    return 'app';
  }
  if (typeof raw === 'string') {
    return raw.trim().toLowerCase() === 'web' ? 'web' : 'app';
  }
  if (
    typeof raw === 'number' ||
    typeof raw === 'boolean' ||
    typeof raw === 'bigint'
  ) {
    return String(raw).toLowerCase() === 'web' ? 'web' : 'app';
  }
  return 'app';
}

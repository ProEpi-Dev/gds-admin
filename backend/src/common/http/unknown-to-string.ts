/**
 * Converte `unknown` para texto sem depender de `String(obj)` em objetos
 * (evita "[object Object]" em logs e chaves).
 */
export function unknownToSafeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object Object]';
    }
  }
  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return `[Function:${fn.name || 'anonymous'}]`;
  }
  return '';
}

export function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err === undefined) {
    return '';
  }
  if (err === null) {
    return 'null';
  }
  if (typeof err === 'object') {
    try {
      return JSON.stringify(err);
    } catch {
      return '[object Object]';
    }
  }
  if (typeof err === 'string') {
    return err;
  }
  if (
    typeof err === 'number' ||
    typeof err === 'boolean' ||
    typeof err === 'bigint'
  ) {
    return String(err);
  }
  if (typeof err === 'symbol') {
    return err.toString();
  }
  if (typeof err === 'function') {
    const fn = err as (...args: unknown[]) => unknown;
    return `[Function:${fn.name || 'anonymous'}]`;
  }
  return '';
}

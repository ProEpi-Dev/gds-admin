import { resolveGdsChannel } from './gds-channel';

describe('resolveGdsChannel', () => {
  it('retorna web quando o valor normaliza para web', () => {
    expect(resolveGdsChannel('WEB')).toBe('web');
    expect(resolveGdsChannel('web')).toBe('web');
  });

  it('retorna app para outros valores ou vazio', () => {
    expect(resolveGdsChannel('app')).toBe('app');
    expect(resolveGdsChannel('mobile')).toBe('app');
    expect(resolveGdsChannel(undefined)).toBe('app');
    expect(resolveGdsChannel('')).toBe('app');
  });

  it('normaliza número, boolean e bigint (ramo não-string)', () => {
    expect(resolveGdsChannel(0)).toBe('app');
    expect(resolveGdsChannel(false)).toBe('app');
    expect(resolveGdsChannel(BigInt(0))).toBe('app');
  });

  it('retorna app para tipos não escalares (ex.: objeto)', () => {
    expect(resolveGdsChannel({})).toBe('app');
  });
});

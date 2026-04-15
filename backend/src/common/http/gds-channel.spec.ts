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
});

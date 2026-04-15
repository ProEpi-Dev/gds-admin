import { errorMessageFromUnknown, unknownToSafeString } from './unknown-to-string';

describe('unknownToSafeString', () => {
  it('trata null/undefined como vazio', () => {
    expect(unknownToSafeString(null)).toBe('');
    expect(unknownToSafeString(undefined)).toBe('');
  });

  it('preserva strings e converte escalares', () => {
    expect(unknownToSafeString('x')).toBe('x');
    expect(unknownToSafeString(1)).toBe('1');
    expect(unknownToSafeString(true)).toBe('true');
    expect(unknownToSafeString(BigInt(2))).toBe('2');
  });

  it('serializa objetos simples em JSON', () => {
    expect(unknownToSafeString({ a: 1 })).toBe('{"a":1}');
  });

  it('usa toString para símbolo', () => {
    const s = Symbol('x');
    expect(unknownToSafeString(s)).toBe(s.toString());
  });

  it('cobre fallback quando JSON.stringify falha', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(unknownToSafeString(circular)).toBe('[object Object]');
  });

  it('cobre função (tipo restante)', () => {
    expect(unknownToSafeString(() => 1)).toBe('[Function:anonymous]');
    function namedFn() {
      return 2;
    }
    expect(unknownToSafeString(namedFn)).toBe('[Function:namedFn]');
  });
});

describe('errorMessageFromUnknown', () => {
  it('usa message de Error', () => {
    expect(errorMessageFromUnknown(new Error('falhou'))).toBe('falhou');
  });

  it('serializa objetos não-Error', () => {
    expect(errorMessageFromUnknown({ code: 500 })).toBe('{"code":500}');
  });

  it('converte primitivos', () => {
    expect(errorMessageFromUnknown('oops')).toBe('oops');
    expect(errorMessageFromUnknown(42)).toBe('42');
  });

  it('trata null e undefined', () => {
    expect(errorMessageFromUnknown(undefined)).toBe('');
    expect(errorMessageFromUnknown(null)).toBe('null');
  });

  it('cobre fallback quando JSON.stringify do erro falha', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(errorMessageFromUnknown(circular)).toBe('[object Object]');
  });
});

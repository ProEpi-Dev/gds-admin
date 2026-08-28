import { maskEmail } from './mask-email.helper';

describe('maskEmail', () => {
  it('mantém as bordas e esconde o miolo', () => {
    expect(maskEmail('joao.silva@gmail.com')).toBe('j********a@g***l.com');
  });

  it('preserva só o último rótulo do domínio', () => {
    // lastIndexOf('.') faz "proepi.org" inteiro virar miolo e só ".br" sobrar.
    expect(maskEmail('fulano@proepi.org.br')).toBe('f****o@p********g.br');
  });

  it('esconde por completo partes de uma ou duas letras', () => {
    expect(maskEmail('ab@cd.com')).toBe('**@**.com');
    expect(maskEmail('a@b.com')).toBe('*@*.com');
  });

  it('não deixa passar o e-mail original em nenhum caso', () => {
    const entradas = [
      'joao.silva@gmail.com',
      'fulano@proepi.org.br',
      'ab@cd.com',
      'x@y.z',
    ];
    for (const entrada of entradas) {
      expect(maskEmail(entrada)).not.toBe(entrada);
      expect(maskEmail(entrada)).toContain('*');
    }
  });

  it('devolve nulo quando não há e-mail', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeNull();
    expect(maskEmail('')).toBeNull();
  });

  it('não quebra com entrada malformada', () => {
    expect(maskEmail('sem-arroba')).toBe('***');
    expect(maskEmail('@dominio.com')).toBe('***');
  });
});

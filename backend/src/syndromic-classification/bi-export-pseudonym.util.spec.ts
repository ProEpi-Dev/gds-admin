import {
  DEV_ONLY_BI_PSEUDONYM_SECRET,
  makeBiExportPseudonym,
  resolveBiExportPseudonymSecret,
} from './bi-export-pseudonym.util';

describe('resolveBiExportPseudonymSecret', () => {
  it('retorna fallback dev quando valor é undefined', () => {
    const out = resolveBiExportPseudonymSecret(undefined);
    expect(out.secret).toBe(DEV_ONLY_BI_PSEUDONYM_SECRET);
    expect(out.isDevFallback).toBe(true);
  });

  it('retorna fallback dev quando valor é null', () => {
    const out = resolveBiExportPseudonymSecret(null);
    expect(out.secret).toBe(DEV_ONLY_BI_PSEUDONYM_SECRET);
    expect(out.isDevFallback).toBe(true);
  });

  it('retorna fallback dev quando valor só tem espaços', () => {
    const out = resolveBiExportPseudonymSecret('   ');
    expect(out.isDevFallback).toBe(true);
    expect(out.secret).toBe(DEV_ONLY_BI_PSEUDONYM_SECRET);
  });

  it('preserva o segredo informado quando válido', () => {
    const out = resolveBiExportPseudonymSecret('  meu-segredo-super  ');
    expect(out.secret).toBe('meu-segredo-super');
    expect(out.isDevFallback).toBe(false);
  });
});

describe('makeBiExportPseudonym', () => {
  const SECRET_A = 'segredo-a-de-pelo-menos-32-bytes-aaaaaa';
  const SECRET_B = 'outro-segredo-diferente-bbbbbbbbbbbbbbb';

  it('é determinístico para mesmas partes e mesmo segredo', () => {
    const a = makeBiExportPseudonym(SECRET_A, [10, 42]);
    const b = makeBiExportPseudonym(SECRET_A, [10, 42]);
    expect(a).toBe(b);
  });

  it('muda quando user muda (mesmo contexto)', () => {
    const u1 = makeBiExportPseudonym(SECRET_A, [10, 42]);
    const u2 = makeBiExportPseudonym(SECRET_A, [10, 43]);
    expect(u1).not.toBe(u2);
  });

  it('muda quando contexto muda (mesmo user)', () => {
    const c1 = makeBiExportPseudonym(SECRET_A, [10, 42]);
    const c2 = makeBiExportPseudonym(SECRET_A, [11, 42]);
    expect(c1).not.toBe(c2);
  });

  it('muda quando o segredo muda (rotação de chave)', () => {
    const withA = makeBiExportPseudonym(SECRET_A, [10, 42]);
    const withB = makeBiExportPseudonym(SECRET_B, [10, 42]);
    expect(withA).not.toBe(withB);
  });

  it('aceita partes numéricas e string equivalentes (mesma canonical)', () => {
    const withNumber = makeBiExportPseudonym(SECRET_A, [10, 42]);
    const withString = makeBiExportPseudonym(SECRET_A, ['10', '42']);
    expect(withNumber).toBe(withString);
  });

  it('produz strings base64url de 22 chars (sem padding)', () => {
    const out = makeBiExportPseudonym(SECRET_A, [1, 2]);
    expect(out).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('participacao_id distinto de user_id gera ref distinto no mesmo contexto', () => {
    const userRef = makeBiExportPseudonym(SECRET_A, [10, 42]);
    const partRef = makeBiExportPseudonym(SECRET_A, [10, 999]);
    expect(userRef).not.toBe(partRef);
  });
});

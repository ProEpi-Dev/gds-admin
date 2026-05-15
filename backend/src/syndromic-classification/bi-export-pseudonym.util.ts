import { createHmac } from 'node:crypto';

/**
 * Fallback usado quando `BI_EXPORT_PSEUDONYM_SECRET` não está configurado.
 * Permite que ambientes de desenvolvimento/teste funcionem sem env, mas o
 * `resolveBiExportPseudonymSecret` sinaliza claramente o uso desse fallback
 * para que o serviço possa registrar um warning.
 *
 * NUNCA deve ser usado em produção: pseudônimos derivados desta string são
 * triviais de reproduzir por qualquer pessoa com acesso ao código-fonte.
 */
export const DEV_ONLY_BI_PSEUDONYM_SECRET =
  '__GDS_DEV_ONLY_BI_PSEUDONYM_SECRET__';

/** Comprimento (em caracteres base64url) do pseudônimo retornado. */
const PSEUDONYM_LENGTH = 22;

export type BiExportPseudonymSecretResolution = {
  secret: string;
  isDevFallback: boolean;
};

/**
 * Resolve o segredo HMAC a partir do valor bruto da env. Trim e checagem de
 * vazio; quando ausente, devolve o fallback de desenvolvimento marcado.
 */
export function resolveBiExportPseudonymSecret(
  raw: string | undefined | null,
): BiExportPseudonymSecretResolution {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (trimmed.length === 0) {
    return { secret: DEV_ONLY_BI_PSEUDONYM_SECRET, isDevFallback: true };
  }
  return { secret: trimmed, isDevFallback: false };
}

/**
 * Gera um identificador pseudonimizado **determinístico** a partir das partes
 * informadas. Mesmas partes + mesmo segredo → mesmo pseudônimo. Trocar o
 * segredo (rotação de chave) muda todos os pseudônimos.
 *
 * Implementação: `HMAC-SHA256(secret, parts.join(':'))` truncado para
 * {@link PSEUDONYM_LENGTH} caracteres base64url (~132 bits de entropia).
 *
 * @example
 *   makeBiExportPseudonym(secret, [contextId, userId])
 *   // => "a8f3hjQ-2lQK91dC0xT4cz"
 */
export function makeBiExportPseudonym(
  secret: string,
  parts: ReadonlyArray<string | number>,
): string {
  const canonical = parts.map((part) => String(part)).join(':');
  return createHmac('sha256', secret)
    .update(canonical)
    .digest('base64url')
    .slice(0, PSEUDONYM_LENGTH);
}

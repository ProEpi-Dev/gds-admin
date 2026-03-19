/**
 * Constantes de senha alinhadas à migração do sistema legado (Rails/Devise).
 * Cost factor 11: compatível com hashes existentes; novos hashes usam o mesmo cost.
 * Regras de complexidade (min/max, regex) permanecem nos DTOs para compatibilidade com consumidores atuais.
 */
export const BCRYPT_ROUNDS = 11;

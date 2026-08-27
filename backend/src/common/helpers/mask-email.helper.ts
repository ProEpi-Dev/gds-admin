/**
 * Mascara um e-mail para registro em auditoria.
 *
 * Existe uma tensão real aqui. A LGPD exige que a operação de eliminação seja
 * demonstrável (art. 6º, X), mas guardar o e-mail em texto claro no log de
 * auditoria conservaria justamente o dado que a pessoa pediu para apagar.
 *
 * O meio-termo é guardar o suficiente para correlacionar com o chamado de
 * suporte que originou o pedido, e não o bastante para servir de identificador.
 *
 *   joao.silva@gmail.com  ->  j*********a@g****.com
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');

  const maskedLocal = maskKeepingEdges(local);
  if (dot <= 0) return `${maskedLocal}@${maskKeepingEdges(domain)}`;

  const domainName = domain.slice(0, dot);
  const tld = domain.slice(dot);
  return `${maskedLocal}@${maskKeepingEdges(domainName)}${tld}`;
}

/** Mantém a primeira e a última letra; o miolo vira asteriscos. */
function maskKeepingEdges(part: string): string {
  if (part.length <= 2) return '*'.repeat(part.length);
  return `${part[0]}${'*'.repeat(part.length - 2)}${part[part.length - 1]}`;
}

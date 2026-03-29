/**
 * Formata data "somente calendário" retornada pela API (ex.: participação).
 * O backend envia meia-noite UTC (`2026-03-29T00:00:00.000Z`) para um {@link Date} SQL
 * sem horário; o dia civil correto é **29/03**, não o resultado de `new Date(...)` no
 * fuso local (que vira 28/03 em Brasília).
 *
 * Usa sempre a parte `YYYY-MM-DD` da string, sem conversão de timezone.
 */
export function formatDateOnlyFromApi(
  isoDate: string | null | undefined,
): string {
  if (isoDate == null || isoDate === '') return '';
  const raw = String(isoDate).trim();
  const datePart = raw.includes('T') ? raw.split('T')[0]! : raw;
  const parts = datePart.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0]!, 10);
  const m = parseInt(parts[1]!, 10);
  const d = parseInt(parts[2]!, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return '';
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/**
 * Formata data-hora completa (createdAt, updatedAt). O instante é interpretado
 * corretamente em relação ao UTC; a exibição segue o fuso e o formato do `localeTag`.
 */
export function formatDateTimeFromApi(
  isoDate: string | null | undefined,
  localeTag: string,
): string {
  if (isoDate == null || isoDate === '') return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  const tag = localeTag.startsWith('pt') ? 'pt-BR' : 'en-US';
  return new Intl.DateTimeFormat(tag, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

import { formatInTimeZone } from 'date-fns-tz';

/** Data civil “hoje” no fuso usado para vigência de ciclos (alinhado ao restante do produto em BRT). */
export const TRACK_CYCLE_SCHEDULE_TZ = 'America/Sao_Paulo' as const;

export type ScheduleOverride = {
  start_date: Date | null;
  end_date: Date | null;
};

/** Normaliza para comparar apenas o dia civil em UTC (yyyy-MM-dd à meia-noite UTC). */
export function toDateOnlyUtc(d: Date): Date {
  const ymd = d.toISOString().split('T')[0];
  return new Date(`${ymd}T00:00:00.000Z`);
}

function dateOnlyOrFallback(value: Date | null | undefined, fallback: Date): Date {
  if (value === undefined || value === null) {
    return fallback;
  }
  return toDateOnlyUtc(value);
}

export function todayDateOnlyUtc(): Date {
  const ymd = formatInTimeZone(new Date(), TRACK_CYCLE_SCHEDULE_TZ, 'yyyy-MM-dd');
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function resolveSectionEffectiveWindow(
  cycleStart: Date,
  cycleEnd: Date,
  override: ScheduleOverride | null | undefined,
): { start: Date; end: Date } {
  const cS = toDateOnlyUtc(cycleStart);
  const cE = toDateOnlyUtc(cycleEnd);
  let s = dateOnlyOrFallback(override?.start_date, cS);
  let e = dateOnlyOrFallback(override?.end_date, cE);
  if (s < cS) s = cS;
  if (e > cE) e = cE;
  return { start: s, end: e };
}

export function resolveSequenceEffectiveWindow(
  sectionWindow: { start: Date; end: Date },
  override: ScheduleOverride | null | undefined,
): { start: Date; end: Date } {
  let s = dateOnlyOrFallback(override?.start_date, sectionWindow.start);
  let e = dateOnlyOrFallback(override?.end_date, sectionWindow.end);
  if (s < sectionWindow.start) s = sectionWindow.start;
  if (e > sectionWindow.end) e = sectionWindow.end;
  return { start: s, end: e };
}

export function assertValidWindow(start: Date, end: Date): void {
  if (start > end) {
    throw new Error('Janela efetiva inválida: início após término');
  }
}

export type ScheduleAccess = 'open' | 'upcoming' | 'expired';

export function scheduleAccessForToday(
  today: Date,
  window: { start: Date; end: Date },
  isCompleted: boolean,
): ScheduleAccess {
  if (isCompleted) return 'open';
  const t = toDateOnlyUtc(today);
  const { start, end } = window;
  if (t < start) return 'upcoming';
  if (t > end) return 'expired';
  return 'open';
}

export function assertTodayWithinCycle(
  today: Date,
  cycleStart: Date,
  cycleEnd: Date,
): void {
  const t = toDateOnlyUtc(today);
  const cS = toDateOnlyUtc(cycleStart);
  const cE = toDateOnlyUtc(cycleEnd);
  if (t < cS) {
    throw new Error('CYCLE_NOT_STARTED');
  }
  if (t > cE) {
    throw new Error('CYCLE_ENDED');
  }
}

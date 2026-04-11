import {
  resolveSectionEffectiveWindow,
  resolveSequenceEffectiveWindow,
  scheduleAccessForToday,
  assertTodayWithinCycle,
  toDateOnlyUtc,
} from './track-cycle-schedule.util';

describe('track-cycle-schedule.util', () => {
  const cycleStart = new Date('2026-01-01T00:00:00.000Z');
  const cycleEnd = new Date('2026-06-30T00:00:00.000Z');

  it('resolveSectionEffectiveWindow sem override repete o ciclo', () => {
    const w = resolveSectionEffectiveWindow(cycleStart, cycleEnd, null);
    expect(toDateOnlyUtc(w.start).getTime()).toBe(toDateOnlyUtc(cycleStart).getTime());
    expect(toDateOnlyUtc(w.end).getTime()).toBe(toDateOnlyUtc(cycleEnd).getTime());
  });

  it('resolveSectionEffectiveWindow faz clamp ao ciclo', () => {
    const w = resolveSectionEffectiveWindow(cycleStart, cycleEnd, {
      start_date: new Date('2025-12-01T00:00:00.000Z'),
      end_date: new Date('2027-01-01T00:00:00.000Z'),
    });
    expect(w.start.getTime()).toBe(toDateOnlyUtc(cycleStart).getTime());
    expect(w.end.getTime()).toBe(toDateOnlyUtc(cycleEnd).getTime());
  });

  it('resolveSequenceEffectiveWindow restringe à janela da seção', () => {
    const sectionWin = {
      start: new Date('2026-02-01T00:00:00.000Z'),
      end: new Date('2026-02-28T00:00:00.000Z'),
    };
    const w = resolveSequenceEffectiveWindow(sectionWin, {
      start_date: null,
      end_date: null,
    });
    expect(w.start.getTime()).toBe(sectionWin.start.getTime());
    expect(w.end.getTime()).toBe(sectionWin.end.getTime());
  });

  it('scheduleAccessForToday: antes = upcoming, depois = expired, concluído = open', () => {
    const win = {
      start: new Date('2026-03-10T00:00:00.000Z'),
      end: new Date('2026-03-20T00:00:00.000Z'),
    };
    const dayBefore = new Date('2026-03-09T00:00:00.000Z');
    const dayIn = new Date('2026-03-15T00:00:00.000Z');
    const dayAfter = new Date('2026-03-21T00:00:00.000Z');

    expect(scheduleAccessForToday(dayBefore, win, false)).toBe('upcoming');
    expect(scheduleAccessForToday(dayIn, win, false)).toBe('open');
    expect(scheduleAccessForToday(dayAfter, win, false)).toBe('expired');
    expect(scheduleAccessForToday(dayAfter, win, true)).toBe('open');
  });

  it('assertTodayWithinCycle lança fora do intervalo', () => {
    expect(() =>
      assertTodayWithinCycle(
        new Date('2025-12-01T00:00:00.000Z'),
        cycleStart,
        cycleEnd,
      ),
    ).toThrow('CYCLE_NOT_STARTED');
    expect(() =>
      assertTodayWithinCycle(
        new Date('2027-01-01T00:00:00.000Z'),
        cycleStart,
        cycleEnd,
      ),
    ).toThrow('CYCLE_ENDED');
  });
});

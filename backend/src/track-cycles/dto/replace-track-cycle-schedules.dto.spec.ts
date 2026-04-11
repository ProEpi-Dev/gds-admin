import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplaceTrackCycleSchedulesDto } from './replace-track-cycle-schedules.dto';
import { NormalizeReplaceTrackCycleSchedulesPipe } from '../pipes/normalize-replace-track-cycle-schedules.pipe';

const transformOpts = { enableImplicitConversion: true };

describe('ReplaceTrackCycleSchedulesDto + pipe de normalização', () => {
  const pipe = new NormalizeReplaceTrackCycleSchedulesPipe();

  it('camelCase direto no DTO continua válido', async () => {
    const raw = {
      sectionSchedules: [{ sectionId: 10, startDate: '2026-03-01', endDate: '2026-03-31' }],
      sequenceSchedules: [],
    };
    const dto = plainToInstance(ReplaceTrackCycleSchedulesDto, raw, transformOpts);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('snake_case no corpo é normalizado e passa na validação', async () => {
    const normalized = pipe.transform({
      section_schedules: [
        { section_id: 10, start_date: '2026-03-01', end_date: '2026-03-31' },
      ],
      sequence_schedules: [
        { sequence_id: 20, start_date: '2026-03-05', end_date: null },
      ],
    });
    const dto = plainToInstance(ReplaceTrackCycleSchedulesDto, normalized, transformOpts);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.sectionSchedules[0].sectionId).toBe(10);
    expect(dto.sequenceSchedules[0].sequenceId).toBe(20);
    expect(dto.sequenceSchedules[0].endDate).toBeNull();
  });

  it('null nos arrays vira [] (serviço não quebra em .map)', () => {
    const normalized = pipe.transform({
      sectionSchedules: null,
      sequenceSchedules: null,
    } as unknown as Record<string, unknown>);
    expect(normalized.sectionSchedules).toEqual([]);
    expect(normalized.sequenceSchedules).toEqual([]);
  });
});

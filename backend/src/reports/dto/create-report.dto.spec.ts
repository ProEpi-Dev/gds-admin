import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

describe('CreateReportDto', () => {
  const base = {
    participationId: 1,
    formVersionId: 1,
    reportType: 'POSITIVE',
    formResponse: {},
  };

  const reportDateErrors = async (reportDate: unknown) => {
    const dto = plainToInstance(CreateReportDto, { ...base, reportDate });
    const errors = await validate(dto);
    return errors.filter((e) => e.property === 'reportDate');
  };

  describe('reportDate', () => {
    it('é opcional', async () => {
      expect(await reportDateErrors(undefined)).toHaveLength(0);
    });

    it.each([
      '2026-10-08T14:30:00-03:00',
      '2026-10-08T17:30:00Z',
      '2026-10-08T17:30:00.123Z',
      '2026-10-08T14:30-03:00',
    ])('aceita data e hora com fuso: %s', async (value) => {
      expect(await reportDateErrors(value)).toHaveLength(0);
    });

    it.each([
      [
        'só a data (viraria meia-noite UTC = dia anterior em Brasília)',
        '2026-10-08',
      ],
      ['sem fuso (hora ambígua)', '2026-10-08T14:30:00'],
      ['texto qualquer', 'ontem'],
      ['data inexistente', '2026-02-30T10:00:00Z'],
    ])('rejeita %s', async (_caso, value) => {
      expect(await reportDateErrors(value)).not.toHaveLength(0);
    });
  });
});

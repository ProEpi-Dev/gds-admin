import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateMaintenanceWindowDto,
  MaintenanceWindowQueryDto,
  UpdateMaintenanceWindowDto,
} from './maintenance-window.dto';

const VALID = {
  mode: 'full',
  startsAt: '2026-08-10T02:00:00.000Z',
  endsAt: '2026-08-10T06:00:00.000Z',
  title: { pt: 'Manutenção programada', en: 'Scheduled maintenance' },
  message: { pt: 'Voltamos às 6h' },
};

async function errorsFor(payload: Record<string, unknown>) {
  return validate(plainToInstance(CreateMaintenanceWindowDto, payload));
}

describe('CreateMaintenanceWindowDto', () => {
  it('aceita uma janela completa', async () => {
    expect(await errorsFor(VALID)).toHaveLength(0);
  });

  it('aceita janela sem fim previsto', async () => {
    const semFim = { ...VALID };
    delete (semFim as Partial<typeof VALID>).endsAt;

    expect(await errorsFor(semFim)).toHaveLength(0);
  });

  it.each(['banner', 'read_only', 'full'])('aceita o modo %s', async (mode) => {
    expect(await errorsFor({ ...VALID, mode })).toHaveLength(0);
  });

  it('rejeita modo fora do enum', async () => {
    const errors = await errorsFor({ ...VALID, mode: 'parcial' });

    expect(errors.map((e) => e.property)).toContain('mode');
  });

  it('rejeita data fora do ISO 8601', async () => {
    const errors = await errorsFor({ ...VALID, startsAt: '10/08/2026' });

    expect(errors.map((e) => e.property)).toContain('startsAt');
  });

  // pt é o fallback da resolução por Accept-Language: sem ele a tela de
  // manutenção ficaria sem texto justamente quando nada mais funciona.
  it('rejeita título sem o locale pt', async () => {
    const errors = await errorsFor({ ...VALID, title: { en: 'only english' } });

    expect(errors.map((e) => e.property)).toContain('title');
  });

  it('rejeita mensagem sem o locale pt', async () => {
    const errors = await errorsFor({ ...VALID, message: { es: 'hola' } });

    expect(errors.map((e) => e.property)).toContain('message');
  });

  it('rejeita título com pt vazio', async () => {
    const errors = await errorsFor({ ...VALID, title: { pt: '' } });

    expect(errors.map((e) => e.property)).toContain('title');
  });

  it('rejeita active não booleano', async () => {
    const errors = await errorsFor({ ...VALID, active: 'sim' });

    expect(errors.map((e) => e.property)).toContain('active');
  });
});

describe('UpdateMaintenanceWindowDto', () => {
  it('aceita alteração parcial', async () => {
    const instance = plainToInstance(UpdateMaintenanceWindowDto, {
      active: false,
    });

    expect(await validate(instance)).toHaveLength(0);
  });

  it('aceita corpo vazio', async () => {
    const instance = plainToInstance(UpdateMaintenanceWindowDto, {});

    expect(await validate(instance)).toHaveLength(0);
  });

  it('mantém a validação nos campos enviados', async () => {
    const instance = plainToInstance(UpdateMaintenanceWindowDto, {
      mode: 'parcial',
    });

    expect((await validate(instance)).map((e) => e.property)).toContain('mode');
  });
});

describe('MaintenanceWindowQueryDto', () => {
  it('converte page e pageSize de string para número', () => {
    const instance = plainToInstance(MaintenanceWindowQueryDto, {
      page: '3',
      pageSize: '15',
    });

    expect(instance.page).toBe(3);
    expect(instance.pageSize).toBe(15);
  });

  it('aceita filtros válidos', async () => {
    const instance = plainToInstance(MaintenanceWindowQueryDto, {
      active: true,
      mode: 'banner',
    });

    expect(await validate(instance)).toHaveLength(0);
  });

  it('rejeita modo fora do enum', async () => {
    const instance = plainToInstance(MaintenanceWindowQueryDto, {
      mode: 'parcial',
    });

    expect((await validate(instance)).map((e) => e.property)).toContain('mode');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../prisma/prisma.service';

const NOW = new Date('2026-08-10T03:00:00.000Z');

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    mode: 'full',
    title: { pt: 'Manutenção', en: 'Maintenance' },
    message: { pt: 'Voltamos às 6h', en: 'Back at 6am' },
    starts_at: new Date('2026-08-10T02:00:00.000Z'),
    ends_at: new Date('2026-08-10T06:00:00.000Z'),
    ...overrides,
  };
}

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let findMany: jest.Mock;
  let logger: { error: jest.Mock };

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    logger = { error: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: PrismaService,
          useValue: { maintenance_window: { findMany } },
        },
        {
          provide: `PinoLogger:${MaintenanceService.name}`,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get(MaintenanceService);
  });

  describe('getActiveWindow', () => {
    it('retorna null quando não há janela vigente', async () => {
      await expect(service.getActiveWindow(NOW)).resolves.toBeNull();
    });

    it('filtra por active, início já ocorrido e fim ainda não atingido', async () => {
      await service.getActiveWindow(NOW);

      expect(findMany).toHaveBeenCalledWith({
        where: {
          active: true,
          starts_at: { lte: NOW },
          OR: [{ ends_at: null }, { ends_at: { gt: NOW } }],
        },
      });
    });

    it('mapeia a linha para o formato do guard', async () => {
      findMany.mockResolvedValue([row()]);

      const window = await service.getActiveWindow(NOW);

      expect(window).toEqual({
        mode: 'full',
        title: { pt: 'Manutenção', en: 'Maintenance' },
        message: { pt: 'Voltamos às 6h', en: 'Back at 6am' },
        startsAt: new Date('2026-08-10T02:00:00.000Z'),
        endsAt: new Date('2026-08-10T06:00:00.000Z'),
      });
    });

    it('em janelas sobrepostas escolhe a mais restritiva', async () => {
      findMany.mockResolvedValue([
        row({ mode: 'banner' }),
        row({ mode: 'full' }),
        row({ mode: 'read_only' }),
      ]);

      const window = await service.getActiveWindow(NOW);

      expect(window?.mode).toBe('full');
    });

    it('no empate de severidade escolhe a que começou antes', async () => {
      findMany.mockResolvedValue([
        row({ mode: 'full', starts_at: new Date('2026-08-10T02:30:00.000Z') }),
        row({ mode: 'full', starts_at: new Date('2026-08-10T01:00:00.000Z') }),
      ]);

      const window = await service.getActiveWindow(NOW);

      expect(window?.startsAt).toEqual(new Date('2026-08-10T01:00:00.000Z'));
    });
  });

  describe('falha aberto', () => {
    it('libera a requisição quando a consulta estoura', async () => {
      findMany.mockRejectedValue(
        new Error('relation "maintenance_window" does not exist'),
      );

      await expect(service.getActiveWindow(NOW)).resolves.toBeNull();
    });

    it('registra o erro para a falha não passar despercebida', async () => {
      findMany.mockRejectedValue(new Error('conexão recusada'));

      await service.getActiveWindow(NOW);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'MAINTENANCE_LOOKUP_FAILED' }),
        expect.any(String),
      );
    });

    it('não reconsulta o banco a cada requisição enquanto ele está fora', async () => {
      findMany.mockRejectedValue(new Error('conexão recusada'));

      await service.getActiveWindow(NOW);
      await service.getActiveWindow(new Date(NOW.getTime() + 1_000));

      expect(findMany).toHaveBeenCalledTimes(1);
    });

    it('volta a consultar depois do TTL curto de erro', async () => {
      findMany.mockRejectedValue(new Error('conexão recusada'));

      await service.getActiveWindow(NOW);
      findMany.mockResolvedValue([row()]);
      const recovered = await service.getActiveWindow(
        new Date(NOW.getTime() + 6_000),
      );

      expect(recovered?.mode).toBe('full');
    });
  });

  describe('cache', () => {
    it('não reconsulta o banco dentro do TTL', async () => {
      findMany.mockResolvedValue([row()]);

      await service.getActiveWindow(NOW);
      await service.getActiveWindow(new Date(NOW.getTime() + 5_000));

      expect(findMany).toHaveBeenCalledTimes(1);
    });

    it('reconsulta depois do TTL', async () => {
      findMany.mockResolvedValue([row()]);

      await service.getActiveWindow(NOW);
      await service.getActiveWindow(new Date(NOW.getTime() + 20_000));

      expect(findMany).toHaveBeenCalledTimes(2);
    });

    it('não estende o cache além do fim da janela', async () => {
      const endsAt = new Date(NOW.getTime() + 3_000);
      findMany.mockResolvedValue([row({ ends_at: endsAt })]);

      await service.getActiveWindow(NOW);
      findMany.mockResolvedValue([]);
      const afterEnd = await service.getActiveWindow(
        new Date(endsAt.getTime() + 1),
      );

      expect(findMany).toHaveBeenCalledTimes(2);
      expect(afterEnd).toBeNull();
    });

    it('invalidateCache força nova consulta', async () => {
      findMany.mockResolvedValue([row()]);

      await service.getActiveWindow(NOW);
      service.invalidateCache();
      await service.getActiveWindow(NOW);

      expect(findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolveText', () => {
    const map = { pt: 'Olá', en: 'Hello', es: 'Hola' };

    it('usa o idioma preferido do Accept-Language', () => {
      expect(service.resolveText(map, 'en-US,en;q=0.9')).toBe('Hello');
    });

    it('respeita a ordem de preferência do header', () => {
      expect(service.resolveText(map, 'es-ES,en;q=0.8')).toBe('Hola');
    });

    it('cai para pt quando o idioma pedido não existe no mapa', () => {
      expect(service.resolveText({ pt: 'Olá' }, 'en')).toBe('Olá');
    });

    it('cai para pt quando não há Accept-Language', () => {
      expect(service.resolveText(map)).toBe('Olá');
    });

    it('ignora idiomas não suportados', () => {
      expect(service.resolveText(map, 'de-DE,fr')).toBe('Olá');
    });

    it('retorna string vazia quando o valor não é um mapa de locales', () => {
      expect(service.resolveText(null)).toBe('');
      expect(service.resolveText('texto solto')).toBe('');
      expect(service.resolveText(['pt'])).toBe('');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceStatusController } from './maintenance-status.controller';
import { MaintenanceService } from './maintenance.service';

const WINDOW = {
  mode: 'full' as const,
  title: { pt: 'Manutenção programada', en: 'Scheduled maintenance' },
  message: { pt: 'Voltamos às 6h', en: 'Back at 6am' },
  startsAt: new Date('2026-08-10T02:00:00.000Z'),
  endsAt: new Date('2026-08-10T06:00:00.000Z'),
};

describe('MaintenanceStatusController', () => {
  let controller: MaintenanceStatusController;
  let maintenance: { getActiveWindow: jest.Mock; resolveText: jest.Mock };

  beforeEach(async () => {
    maintenance = {
      getActiveWindow: jest.fn().mockResolvedValue(null),
      resolveText: jest.fn(
        (value: Record<string, string>, locale?: string) =>
          value?.[locale?.startsWith('en') ? 'en' : 'pt'] ?? '',
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceStatusController],
      providers: [{ provide: MaintenanceService, useValue: maintenance }],
    }).compile();

    controller = module.get(MaintenanceStatusController);
  });

  it('devolve inMaintenance falso e campos nulos fora de janela', async () => {
    await expect(controller.current()).resolves.toEqual({
      inMaintenance: false,
      mode: null,
      title: null,
      message: null,
      startsAt: null,
      endsAt: null,
    });
  });

  it('devolve a janela em vigor com textos resolvidos', async () => {
    maintenance.getActiveWindow.mockResolvedValue(WINDOW);

    await expect(controller.current()).resolves.toEqual({
      inMaintenance: true,
      mode: 'full',
      title: 'Manutenção programada',
      message: 'Voltamos às 6h',
      startsAt: '2026-08-10T02:00:00.000Z',
      endsAt: '2026-08-10T06:00:00.000Z',
    });
  });

  it('resolve os textos pelo Accept-Language recebido', async () => {
    maintenance.getActiveWindow.mockResolvedValue(WINDOW);

    const result = await controller.current('en-US,en;q=0.9');

    expect(result.title).toBe('Scheduled maintenance');
    expect(result.message).toBe('Back at 6am');
  });

  // O modo banner não faz nenhuma requisição falhar: este endpoint é o único
  // jeito de o cliente descobrir que a janela existe.
  it('reporta janela banner normalmente', async () => {
    maintenance.getActiveWindow.mockResolvedValue({
      ...WINDOW,
      mode: 'banner',
    });

    const result = await controller.current();

    expect(result.inMaintenance).toBe(true);
    expect(result.mode).toBe('banner');
  });

  it('devolve endsAt nulo quando não há previsão de retorno', async () => {
    maintenance.getActiveWindow.mockResolvedValue({ ...WINDOW, endsAt: null });

    await expect(controller.current()).resolves.toEqual(
      expect.objectContaining({ endsAt: null, inMaintenance: true }),
    );
  });
});

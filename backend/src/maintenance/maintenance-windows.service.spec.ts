import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaintenanceWindowsService } from './maintenance-windows.service';
import { MaintenanceService } from './maintenance.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const ROW = {
  id: 1,
  mode: 'full',
  starts_at: new Date('2026-08-10T02:00:00.000Z'),
  ends_at: new Date('2026-08-10T06:00:00.000Z'),
  title: { pt: 'Manutenção' },
  message: { pt: 'Voltamos às 6h' },
  active: true,
  created_at: new Date('2026-08-01T00:00:00.000Z'),
  updated_at: new Date('2026-08-01T00:00:00.000Z'),
};

const VALID_INPUT = {
  mode: 'full' as const,
  startsAt: '2026-08-10T02:00:00.000Z',
  endsAt: '2026-08-10T06:00:00.000Z',
  title: { pt: 'Manutenção' },
  message: { pt: 'Voltamos às 6h' },
};

describe('MaintenanceWindowsService', () => {
  let service: MaintenanceWindowsService;
  let prisma: {
    maintenance_window: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let maintenance: { invalidateCache: jest.Mock };
  let audit: { record: jest.Mock };

  beforeEach(async () => {
    prisma = {
      maintenance_window: {
        findMany: jest.fn().mockResolvedValue([ROW]),
        findUnique: jest.fn().mockResolvedValue(ROW),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(ROW),
        update: jest.fn().mockResolvedValue(ROW),
        delete: jest.fn().mockResolvedValue(ROW),
      },
    };
    maintenance = { invalidateCache: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceWindowsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MaintenanceService, useValue: maintenance },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get(MaintenanceWindowsService);
  });

  describe('findAll', () => {
    it('pagina e ordena da mais recente para a mais antiga', async () => {
      const result = await service.findAll({ page: 2, pageSize: 10 });

      expect(prisma.maintenance_window.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ starts_at: 'desc' }, { id: 'desc' }],
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta.totalItems).toBe(1);
    });

    it('filtra por active e mode quando informados', async () => {
      await service.findAll({ active: true, mode: 'banner' });

      expect(prisma.maintenance_window.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, mode: 'banner' } }),
      );
    });

    it('não filtra quando nada é informado', async () => {
      await service.findAll({});

      expect(prisma.maintenance_window.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('inEffect', () => {
    it('é falso para janela desabilitada mesmo dentro do período', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-08-10T03:00:00.000Z').getTime());
      prisma.maintenance_window.findUnique.mockResolvedValue({
        ...ROW,
        active: false,
      });

      const result = await service.findOne(1);

      expect(result.inEffect).toBe(false);
      jest.restoreAllMocks();
    });

    it('é verdadeiro dentro do período com a janela habilitada', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-08-10T03:00:00.000Z').getTime());

      const result = await service.findOne(1);

      expect(result.inEffect).toBe(true);
      jest.restoreAllMocks();
    });

    it('é falso depois do fim da janela', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2026-08-10T07:00:00.000Z').getTime());

      const result = await service.findOne(1);

      expect(result.inEffect).toBe(false);
      jest.restoreAllMocks();
    });

    it('é verdadeiro para janela sem fim previsto já iniciada', async () => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2027-01-01T00:00:00.000Z').getTime());
      prisma.maintenance_window.findUnique.mockResolvedValue({
        ...ROW,
        ends_at: null,
      });

      const result = await service.findOne(1);

      expect(result.inEffect).toBe(true);
      jest.restoreAllMocks();
    });
  });

  describe('create', () => {
    it('persiste convertendo as datas e registra auditoria', async () => {
      await service.create(VALID_INPUT, 7);

      expect(prisma.maintenance_window.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mode: 'full',
          starts_at: new Date('2026-08-10T02:00:00.000Z'),
          ends_at: new Date('2026-08-10T06:00:00.000Z'),
          active: true,
        }),
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MAINTENANCE_WINDOW_CREATE',
          targetEntityType: 'maintenance_window',
          targetEntityId: 1,
          actor: { userId: 7 },
        }),
      );
    });

    it('invalida o cache para a janela valer sem esperar o TTL', async () => {
      await service.create(VALID_INPUT, 7);

      expect(maintenance.invalidateCache).toHaveBeenCalled();
    });

    it('aceita janela sem fim previsto', async () => {
      await service.create({ ...VALID_INPUT, endsAt: null }, 7);

      expect(prisma.maintenance_window.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ends_at: null }),
      });
    });

    it('rejeita período invertido antes de chegar no banco', async () => {
      await expect(
        service.create(
          {
            ...VALID_INPUT,
            startsAt: '2026-08-10T06:00:00.000Z',
            endsAt: '2026-08-10T02:00:00.000Z',
          },
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.maintenance_window.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('altera apenas os campos enviados', async () => {
      await service.update(1, { active: false }, 7);

      expect(prisma.maintenance_window.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('valida o período combinando o enviado com o já gravado', async () => {
      await expect(
        service.update(1, { startsAt: '2026-08-10T08:00:00.000Z' }, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite limpar o fim previsto', async () => {
      await service.update(1, { endsAt: null }, 7);

      expect(prisma.maintenance_window.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ends_at: null },
      });
    });

    it('registra os campos alterados na auditoria', async () => {
      await service.update(1, { active: false }, 7);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MAINTENANCE_WINDOW_UPDATE',
          metadata: expect.objectContaining({ changedFields: ['active'] }),
        }),
      );
    });

    it('404 quando a janela não existe', async () => {
      prisma.maintenance_window.findUnique.mockResolvedValue(null);

      await expect(
        service.update(99, { active: false }, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('apaga, invalida o cache e registra auditoria', async () => {
      await service.remove(1, 7);

      expect(prisma.maintenance_window.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(maintenance.invalidateCache).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'MAINTENANCE_WINDOW_DELETE' }),
      );
    });

    it('404 quando a janela não existe', async () => {
      prisma.maintenance_window.findUnique.mockResolvedValue(null);

      await expect(service.remove(99, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.maintenance_window.delete).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('404 quando a janela não existe', async () => {
      prisma.maintenance_window.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

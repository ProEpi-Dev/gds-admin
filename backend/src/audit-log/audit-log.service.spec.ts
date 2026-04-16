import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuditLogService, AuditLogInput } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
  };

  const validInput: AuditLogInput = {
    action: 'USER_ROLE_CHANGE',
    targetEntityType: 'user',
    targetEntityId: 1,
    actor: { userId: 2 },
    contextId: 3,
    targetUserId: 4,
    metadata: { k: 'v' },
    request: {
      requestId: 'r1',
      channel: 'web',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    },
    occurredAt: new Date('2020-01-01T00:00:00.000Z'),
  };

  const sampleRow = {
    id: 1,
    action: 'USER_ROLE_CHANGE',
    target_entity_type: 'user',
    target_entity_id: '1',
    actor_user_id: 2,
    actor_name: 'A',
    actor_email: 'a@x.com',
    context_id: 3,
    context_name: 'Ctx',
    target_user_id: 4,
    target_user_name: 'T',
    target_user_email: 't@x.com',
    request_id: 'r1',
    channel: 'web',
    ip_address: '127.0.0.1',
    user_agent: 'jest',
    metadata: { k: 'v' },
    occurred_at: new Date('2020-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('record', () => {
    it('insere log com metadados e request', async () => {
      await service.record(validInput);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('insere sem metadata (null no SQL)', async () => {
      const { metadata: _m, ...rest } = validInput;
      await service.record(rest);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('insere sem occurredAt (usa data atual no SQL)', async () => {
      const { occurredAt: _o, ...rest } = validInput;
      await service.record(rest);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('permite actor com userId null (sistema)', async () => {
      await service.record({
        ...validInput,
        actor: { userId: null },
      });
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('lança BadRequestException se action vazio', async () => {
      await expect(
        service.record({ ...validInput, action: '' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lança se targetEntityType vazio', async () => {
      await expect(
        service.record({ ...validInput, targetEntityType: '' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lança se targetEntityId inválido', async () => {
      await expect(
        service.record({ ...validInput, targetEntityId: '' as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lança se targetEntityId é null', async () => {
      await expect(
        service.record({ ...validInput, targetEntityId: null as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lança se actor.userId é undefined', async () => {
      await expect(
        service.record({
          ...validInput,
          actor: { userId: undefined },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lança se actor ausente', async () => {
      await expect(
        service.record({ ...validInput, actor: undefined as any }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('recordWithTx', () => {
    it('delega insert ao client de transação', async () => {
      const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
      await service.recordWithTx(tx as any, validInput);
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('recordMany', () => {
    it('chama insert para cada item', async () => {
      await service.recordMany([validInput, { ...validInput, targetEntityId: 2 }]);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([sampleRow]);
    });

    it('retorna lista paginada com defaults', async () => {
      const result = await service.findAll({} as AuditLogQueryDto);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(result.data[0].actorName).toBe('A');
      expect(result.meta.totalItems).toBe(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('usa total 0 quando COUNT não retorna linha', async () => {
      prisma.$queryRaw
        .mockReset()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const result = await service.findAll({} as AuditLogQueryDto);
      expect(result.meta.totalItems).toBe(0);
    });

    it('inclui sortDirection nos queryParams quando informado', async () => {
      prisma.$queryRaw
        .mockReset()
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);
      await service.findAll({ sortDirection: 'desc' } as AuditLogQueryDto);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('aplica filtros e busca, ordenação asc', async () => {
      prisma.$queryRaw
        .mockReset()
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      const q: AuditLogQueryDto = {
        page: 2,
        pageSize: 10,
        action: 'X',
        targetEntityType: 'user',
        actorUserId: 5,
        contextId: 6,
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-12-31T23:59:59.999Z',
        search: '  foo  ',
        sortDirection: 'asc',
      };
      const result = await service.findAll(q);
      expect(result.data).toEqual([]);
      expect(result.meta.page).toBe(2);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});

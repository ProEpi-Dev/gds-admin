import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContextsService } from './contexts.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextQueryDto } from './dto/context-query.dto';
import { ReportStreakQueryDto } from '../reports/dto/report-streak-query.dto';
import { ParticipationReportStreakQueryDto } from '../reports/dto/participation-report-streak-query.dto';

describe('ContextsService', () => {
  let service: ContextsService;
  let prismaService: PrismaService;
  let reportsService: ReportsService;

  const mockContext = {
    id: 1,
    name: 'Test Context',
    location_id: 1,
    description: 'Test Description',
    type: 'TEST',
    access_type: 'PUBLIC',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    context_module: [{ module_code: 'self_health' }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextsService,
        {
          provide: PrismaService,
          useValue: {
            context: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            location: {
              findUnique: jest.fn(),
            },
            participation: {
              count: jest.fn(),
            },
            form: {
              count: jest.fn(),
            },
            context_configuration: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ReportsService,
          useValue: {
            findContextReportStreaks: jest.fn(),
            findParticipationReportStreak: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            record: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ContextsService>(ContextsService);
    prismaService = module.get<PrismaService>(PrismaService);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  describe('create', () => {
    it('deve criar contexto com sucesso', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        active: true,
      };

      jest
        .spyOn(prismaService.context, 'create')
        .mockResolvedValue(mockContext as any);

      const result = await service.create(createContextDto, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test Context');
    });

    it('deve incluir description quando fornecido', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        description: 'Test Description',
      };

      jest
        .spyOn(prismaService.context, 'create')
        .mockResolvedValue(mockContext as any);

      await service.create(createContextDto, 1);

      expect(prismaService.context.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Test Description',
          }),
        }),
      );
    });

    it('deve incluir type quando fornecido', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        type: 'TEST',
      };

      jest
        .spyOn(prismaService.context, 'create')
        .mockResolvedValue(mockContext as any);

      await service.create(createContextDto, 1);

      expect(prismaService.context.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TEST',
          }),
        }),
      );
    });

    it('deve validar location_id quando fornecido', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        locationId: 1,
      };

      const mockLocation = { id: 1, name: 'Test Location' };
      jest
        .spyOn(prismaService.location, 'findUnique')
        .mockResolvedValue(mockLocation as any);
      jest
        .spyOn(prismaService.context, 'create')
        .mockResolvedValue(mockContext as any);

      await service.create(createContextDto, 1);

      expect(prismaService.location.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar BadRequestException quando location não existe', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        locationId: 999,
      };

      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createContextDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando mais de um módulo é informado', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        modules: ['self_health', 'community_signal'],
      };

      await expect(service.create(createContextDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: ContextQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.context, 'findMany')
        .mockResolvedValue([mockContext] as any);
      jest.spyOn(prismaService.context, 'count').mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
    });

    it('deve aplicar filtros corretamente', async () => {
      const query: ContextQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        locationId: 1,
        accessType: 'PUBLIC',
      };

      jest
        .spyOn(prismaService.context, 'findMany')
        .mockResolvedValue([] as any);
      jest.spyOn(prismaService.context, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.context.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
            location_id: 1,
            access_type: 'PUBLIC',
          }),
        }),
      );
    });

    it('deve aplicar busca por nome', async () => {
      const query: ContextQueryDto = {
        page: 1,
        pageSize: 20,
        active: true,
        search: 'Cabo',
      };

      jest
        .spyOn(prismaService.context, 'findMany')
        .mockResolvedValue([] as any);
      jest.spyOn(prismaService.context, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.context.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Cabo', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('findConfiguration', () => {
    it('deve lançar NotFoundException se o contexto não existe', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.findConfiguration(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve retornar entradas ordenadas por chave', async () => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue({ id: 1 } as any);
      const rows = [
        {
          id: 1,
          key: 'a_key',
          value: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          key: 'b_key',
          value: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      jest
        .spyOn(prismaService.context_configuration, 'findMany')
        .mockResolvedValue(rows as any);

      const result = await service.findConfiguration(1);

      expect(prismaService.context_configuration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { context_id: 1 },
          orderBy: { key: 'asc' },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 1,
        key: 'a_key',
        value: 0,
      });
    });
  });

  describe('upsertConfiguration', () => {
    beforeEach(() => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue({ id: 1 } as any);
    });

    it('deve criar quando não existe', async () => {
      jest
        .spyOn(prismaService.context_configuration, 'findFirst')
        .mockResolvedValue(null);
      const created = {
        id: 10,
        key: 'negative_report_dedup_window_min',
        value: 90,
        created_at: new Date(),
        updated_at: new Date(),
      };
      jest
        .spyOn(prismaService.context_configuration, 'create')
        .mockResolvedValue(created as any);

      const result = await service.upsertConfiguration(
        1,
        'negative_report_dedup_window_min',
        90,
        1,
      );

      expect(prismaService.context_configuration.create).toHaveBeenCalled();
      expect(result.key).toBe('negative_report_dedup_window_min');
      expect(result.value).toBe(90);
    });

    it('deve atualizar quando já existe', async () => {
      jest
        .spyOn(prismaService.context_configuration, 'findFirst')
        .mockResolvedValue({ id: 5 } as any);
      const updated = {
        id: 5,
        key: 'negative_report_dedup_window_min',
        value: 120,
        created_at: new Date(),
        updated_at: new Date(),
      };
      jest
        .spyOn(prismaService.context_configuration, 'update')
        .mockResolvedValue(updated as any);

      const result = await service.upsertConfiguration(
        1,
        'negative_report_dedup_window_min',
        120,
        1,
      );

      expect(prismaService.context_configuration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ value: 120 }),
        }),
      );
      expect(result.value).toBe(120);
    });

    it('deve rejeitar chave com caracteres inválidos', async () => {
      await expect(service.upsertConfiguration(1, 'BAD-KEY', 1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve rejeitar valor numérico inválido para janela de dedup', async () => {
      jest
        .spyOn(prismaService.context_configuration, 'findFirst')
        .mockResolvedValue(null);

      await expect(
        service.upsertConfiguration(
          1,
          'negative_report_dedup_window_min',
          0,
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('deve retornar contexto quando existe', async () => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateContextDto: UpdateContextDto = {
        name: 'Updated Context',
      };

      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.context, 'update').mockResolvedValue({
        ...mockContext,
        name: 'Updated Context',
      } as any);

      const result = await service.update(1, updateContextDto, 1);

      expect(result).toHaveProperty('name', 'Updated Context');
    });

    it('deve atualizar accessType quando fornecido', async () => {
      const updateContextDto: UpdateContextDto = {
        accessType: 'PRIVATE',
      };

      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(prismaService.context, 'update')
        .mockResolvedValue(mockContext as any);

      await service.update(1, updateContextDto, 1);

      expect(prismaService.context.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { access_type: 'PRIVATE' },
        }),
      );
    });

    it('deve atualizar description quando fornecido', async () => {
      const updateContextDto: UpdateContextDto = {
        description: 'Updated Description',
      };

      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(prismaService.context, 'update')
        .mockResolvedValue(mockContext as any);

      await service.update(1, updateContextDto, 1);

      expect(prismaService.context.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { description: 'Updated Description' },
        }),
      );
    });

    it('deve atualizar type quando fornecido', async () => {
      const updateContextDto: UpdateContextDto = {
        type: 'UPDATED',
      };

      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(prismaService.context, 'update')
        .mockResolvedValue(mockContext as any);

      await service.update(1, updateContextDto, 1);

      expect(prismaService.context.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { type: 'UPDATED' },
        }),
      );
    });

    it('deve validar location_id quando fornecido', async () => {
      const updateContextDto: UpdateContextDto = {
        locationId: 2,
      };

      const mockLocation = { id: 2, name: 'New Location' };
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValueOnce(mockContext as any);
      jest
        .spyOn(prismaService.location, 'findUnique')
        .mockResolvedValue(mockLocation as any);
      jest
        .spyOn(prismaService.context, 'update')
        .mockResolvedValue(mockContext as any);

      await service.update(1, updateContextDto, 1);

      expect(prismaService.location.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateContextDto: UpdateContextDto = {
        name: 'Updated Context',
      };

      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.update(999, updateContextDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando location não existe', async () => {
      const updateContextDto: UpdateContextDto = {
        locationId: 999,
      };

      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValueOnce(mockContext as any);
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.update(1, updateContextDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException ao atualizar com mais de um módulo', async () => {
      const updateContextDto: UpdateContextDto = {
        modules: ['self_health', 'community_signal'],
      };

      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);

      await expect(service.update(1, updateContextDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findReportStreaks', () => {
    it('deve delegar para ReportsService', async () => {
      const query: ReportStreakQueryDto = {
        page: 1,
        pageSize: 20,
      };
      const expected = {
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        links: { first: '', last: '', prev: null, next: null },
      } as any;

      jest
        .spyOn(reportsService, 'findContextReportStreaks')
        .mockResolvedValue(expected);

      const result = await service.findReportStreaks(1, query, 10);

      expect(result).toEqual(expected);
      expect(reportsService.findContextReportStreaks).toHaveBeenCalledWith(
        1,
        query,
        10,
      );
    });
  });

  describe('findParticipationReportStreak', () => {
    it('deve delegar para ReportsService', async () => {
      const query: ParticipationReportStreakQueryDto = {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      };
      const expected = {
        participationId: 1,
        userId: 2,
        userName: 'Maria',
        userEmail: 'maria@example.com',
        active: true,
        currentStreak: 3,
        longestStreak: 5,
        reportedDaysCount: 7,
        lastReportedDate: '2026-03-14',
        currentStreakStartDate: '2026-03-12',
        periodStartDate: '2026-03-01',
        periodEndDate: '2026-03-31',
        reportedDaysInRangeCount: 3,
        reportedDays: [],
      };

      jest
        .spyOn(reportsService, 'findParticipationReportStreak')
        .mockResolvedValue(expected as any);

      const result = await service.findParticipationReportStreak(
        1,
        1,
        query,
        10,
      );

      expect(result).toEqual(expected);
      expect(reportsService.findParticipationReportStreak).toHaveBeenCalledWith(
        1,
        1,
        query,
        10,
      );
    });
  });

  describe('remove', () => {
    it('deve desativar contexto', async () => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.context, 'update').mockResolvedValue({
        ...mockContext,
        active: false,
      } as any);

      await service.remove(1, 1);

      expect(prismaService.context.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui participações', async () => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(2);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando possui formulários', async () => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.form, 'count').mockResolvedValue(2);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('name', 'Test Context');
      expect(result).toHaveProperty('locationId', 1);
      expect(result).toHaveProperty('accessType', 'PUBLIC');
    });
  });
});

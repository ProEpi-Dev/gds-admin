import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthzService } from '../authz/authz.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import {
  ReportsPointsQueryDto,
  REPORTS_POINTS_DEFAULT_LIMIT,
} from './dto/reports-points-query.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let prismaMock: any;

  const mockReport = {
    id: 1,
    participation_id: 1,
    form_version_id: 1,
    report_type: 'POSITIVE',
    occurrence_location: { latitude: -23.5505, longitude: -46.6333 },
    form_response: {},
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  /** Report como retornado por findUnique com include: { participation: { select: { context_id } } } */
  const mockReportWithParticipation = {
    ...mockReport,
    participation: { context_id: 1 },
  };

  const mockParticipation = {
    id: 1,
    user_id: 1,
    context_id: 1,
    active: true,
  };

  const mockFormVersion = {
    id: 1,
    form_id: 1,
    version_number: 1,
  };

  beforeEach(async () => {
    prismaMock = {
      report: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      participation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      form_version: {
        findUnique: jest.fn(),
      },
      participation_report_day: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      participation_report_streak: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    prismaMock.$transaction = jest.fn(async (callback: any) =>
      callback(prismaMock),
    );
    prismaMock.$queryRaw = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuthzService,
          useValue: {
            isAdmin: jest.fn().mockResolvedValue(false),
            hasAnyRole: jest.fn().mockResolvedValue(true),
            resolveListContextId: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<ReportsService>(ReportsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('deve criar report com sucesso', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
        active: true,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.report, 'create')
        .mockResolvedValue(mockReport as any);

      const result = await service.create(createDto, 1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve validar participation e formVersion', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.report, 'create')
        .mockResolvedValue(mockReport as any);

      await service.create(createDto, 1);

      expect(prismaService.participation.findUnique).toHaveBeenCalled();
      expect(prismaService.form_version.findUnique).toHaveBeenCalled();
    });

    it('deve incluir occurrenceLocation quando fornecido', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
        occurrenceLocation: { latitude: -23.5505, longitude: -46.6333 },
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.report, 'create')
        .mockResolvedValue(mockReport as any);

      await service.create(createDto, 1);

      expect(prismaService.report.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          occurrence_location: createDto.occurrenceLocation,
        }),
      });
    });

    it('deve atualizar agregados de dias e ofensiva ao criar report', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.report, 'create').mockResolvedValue({
        ...mockReport,
        created_at: new Date('2026-03-14T10:30:00.000Z'),
      } as any);
      jest
        .spyOn(prismaService.report, 'findMany')
        .mockResolvedValue([
          { report_type: 'POSITIVE' },
          { report_type: 'NEGATIVE' },
          { report_type: 'POSITIVE' },
        ] as any);
      jest
        .spyOn(prismaService.participation_report_day, 'findMany')
        .mockResolvedValue([
          { report_date: new Date('2026-03-10T00:00:00.000Z') },
          { report_date: new Date('2026-03-11T00:00:00.000Z') },
          { report_date: new Date('2026-03-13T00:00:00.000Z') },
          { report_date: new Date('2026-03-14T00:00:00.000Z') },
        ] as any);

      await service.create(createDto, 1);

      expect(
        prismaService.participation_report_day.upsert,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            report_count: 3,
            positive_count: 2,
            negative_count: 1,
          }),
          update: expect.objectContaining({
            report_count: 3,
            positive_count: 2,
            negative_count: 1,
          }),
        }),
      );

      const streakUpsertCall = (
        prismaService.participation_report_streak.upsert as jest.Mock
      ).mock.calls[0][0];

      expect(streakUpsertCall.update.current_streak).toBe(2);
      expect(streakUpsertCall.update.longest_streak).toBe(2);
      expect(streakUpsertCall.update.reported_days_count).toBe(4);
      expect(streakUpsertCall.update.last_reported_date).toEqual(
        new Date('2026-03-14T00:00:00.000Z'),
      );
      expect(streakUpsertCall.update.current_streak_start_date).toEqual(
        new Date('2026-03-13T00:00:00.000Z'),
      );
    });

    it('deve lançar BadRequestException quando participation não existe', async () => {
      const createDto: CreateReportDto = {
        participationId: 999,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar ForbiddenException quando não-admin cria report para participação de outro e não gerencia contexto', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);
      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue({
        ...mockParticipation,
        user_id: 2,
      } as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar BadRequestException quando formVersion não existe', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 999,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: ReportQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.report, 'findMany')
        .mockResolvedValue([mockReport] as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(1);

      const result = await service.findAll(query, 1);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
    });

    it('deve aplicar filtros corretamente', async () => {
      const query: ReportQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
            participation_id: 1,
            form_version_id: 1,
            report_type: 'POSITIVE',
          }),
        }),
      );
    });

    it('deve aplicar filtro por formulário e período', async () => {
      const query: ReportQueryDto = {
        page: 1,
        pageSize: 20,
        formId: 2,
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            form_version: { form_id: 2 },
            created_at: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findPoints', () => {
    it('deve retornar apenas pontos com latitude/longitude válidas', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const reportsWithLocation = [
        {
          report_type: 'POSITIVE',
          occurrence_location: { latitude: -23.5505, longitude: -46.6333 },
        },
        {
          report_type: 'POSITIVE',
          occurrence_location: null,
        },
      ];

      jest
        .spyOn(prismaService as any, '$queryRaw')
        .mockResolvedValue(reportsWithLocation as any);

      const result = await service.findPoints(query, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('latitude', -23.5505);
      expect(result[0]).toHaveProperty('longitude', -46.6333);
    });

    it('deve filtrar por período corretamente', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(prismaService as any, '$queryRaw').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      expect(prismaService.$queryRaw).toHaveBeenCalled();
      expect(prismaService.report.findMany).not.toHaveBeenCalled();
    });

    it('deve filtrar por formId quando fornecido', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        formId: 1,
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            form_version: expect.objectContaining({
              form_id: 1,
            }),
          }),
        }),
      );
    });

    it('deve filtrar por formReference quando fornecido', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        formReference: 'TEST_FORM',
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      expect(prismaService.report.findMany).toHaveBeenCalled();
    });

    it('deve filtrar apenas reports ativos', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(prismaService as any, '$queryRaw').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      expect(prismaService.$queryRaw).toHaveBeenCalled();
      expect(prismaService.report.findMany).not.toHaveBeenCalled();
    });

    it('deve aplicar take e orderBy no findMany quando limit e formId', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        formId: 1,
        limit: 100,
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          orderBy: { created_at: 'desc' },
        }),
      );
      expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('deve passar limit ao $queryRaw quando não há filtro de formulário', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 100,
      };

      jest.spyOn(prismaService as any, '$queryRaw').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      const sqlArg = (prismaService as any).$queryRaw.mock.calls[0][0];
      expect(sqlArg.values).toContain(100);
      expect(prismaService.report.findMany).not.toHaveBeenCalled();
    });

    it('deve usar limite padrão no $queryRaw quando limit omitido', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(prismaService as any, '$queryRaw').mockResolvedValue([] as any);

      await service.findPoints(query, 1);

      const sqlArg = (prismaService as any).$queryRaw.mock.calls[0][0];
      expect(sqlArg.values).toContain(REPORTS_POINTS_DEFAULT_LIMIT);
    });
  });

  describe('findContextReportStreaks', () => {
    it('deve retornar lista paginada de ofensivas do contexto', async () => {
      const query = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([
        {
          ...mockParticipation,
          user: {
            name: 'Maria',
            email: 'maria@example.com',
          },
          participation_report_streak: {
            current_streak: 4,
            longest_streak: 9,
            reported_days_count: 11,
            last_reported_date: new Date('2026-03-14T00:00:00.000Z'),
            current_streak_start_date: new Date('2026-03-11T00:00:00.000Z'),
          },
        },
      ] as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(1);

      const result = await service.findContextReportStreaks(1, query as any, 1);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        participationId: 1,
        userName: 'Maria',
        currentStreak: 4,
        longestStreak: 9,
        reportedDaysCount: 11,
      });
    });

    it('deve aplicar filtros de active e search', async () => {
      const query = {
        page: 1,
        pageSize: 20,
        active: false,
        search: 'maria',
      };

      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValue([] as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);

      await service.findContextReportStreaks(1, query as any, 1);

      expect(prismaService.participation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            context_id: 1,
            active: false,
            user: expect.objectContaining({
              OR: expect.any(Array),
            }),
          }),
        }),
      );
    });
  });

  describe('findParticipationReportStreak', () => {
    it('deve retornar ofensiva e dias reportados para a própria participação', async () => {
      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue({
        ...mockParticipation,
        user: {
          name: 'Maria',
          email: 'maria@example.com',
        },
        participation_report_streak: {
          current_streak: 3,
          longest_streak: 7,
          reported_days_count: 12,
          last_reported_date: new Date('2026-03-14T00:00:00.000Z'),
          current_streak_start_date: new Date('2026-03-12T00:00:00.000Z'),
        },
      } as any);
      jest
        .spyOn(prismaService.participation_report_day, 'findMany')
        .mockResolvedValue([
          {
            report_date: new Date('2026-03-12T00:00:00.000Z'),
            report_count: 1,
            positive_count: 1,
            negative_count: 0,
          },
          {
            report_date: new Date('2026-03-13T00:00:00.000Z'),
            report_count: 2,
            positive_count: 1,
            negative_count: 1,
          },
        ] as any);
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);

      const result = await service.findParticipationReportStreak(
        1,
        1,
        {
          startDate: '2026-03-01',
          endDate: '2026-03-31',
        },
        1,
      );

      expect(result).toMatchObject({
        participationId: 1,
        currentStreak: 3,
        longestStreak: 7,
        reportedDaysInRangeCount: 2,
      });
      expect(result.reportedDays).toEqual([
        {
          date: '2026-03-12',
          reportCount: 1,
          positiveCount: 1,
          negativeCount: 0,
        },
        {
          date: '2026-03-13',
          reportCount: 2,
          positiveCount: 1,
          negativeCount: 1,
        },
      ]);
    });

    it('deve lançar ForbiddenException quando participant tenta acessar ofensiva de outro usuário', async () => {
      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue({
        ...mockParticipation,
        user_id: 2,
        user: {
          name: 'Maria',
          email: 'maria@example.com',
        },
        participation_report_streak: null,
      } as any);
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);

      await expect(
        service.findParticipationReportStreak(1, 1, {}, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar BadRequestException quando período é inválido', async () => {
      await expect(
        service.findParticipationReportStreak(
          1,
          1,
          {
            startDate: '2026-03-31',
            endDate: '2026-03-01',
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando participação não existe', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.findParticipationReportStreak(1, 999, {}, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando participação é de outro contexto', async () => {
      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue({
        ...mockParticipation,
        context_id: 2,
        user: {
          name: 'Maria',
          email: 'maria@example.com',
        },
        participation_report_streak: null,
      } as any);

      await expect(
        service.findParticipationReportStreak(1, 1, {}, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('deve retornar report quando existe', async () => {
      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando usuário não pode gerenciar o contexto', async () => {
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.hasAnyRole as jest.Mock).mockResolvedValue(false);
      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);

      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateDto: UpdateReportDto = {
        reportType: 'NEGATIVE',
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest.spyOn(prismaService.report, 'update').mockResolvedValue({
        ...mockReport,
        report_type: 'NEGATIVE',
      } as any);

      const result = await service.update(1, updateDto, 1);

      expect(result).toHaveProperty('reportType', 'NEGATIVE');
    });

    it('deve atualizar formResponse quando fornecido', async () => {
      const updateDto: UpdateReportDto = {
        formResponse: { newField: 'value' },
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.report, 'update')
        .mockResolvedValue(mockReport as any);

      await service.update(1, updateDto, 1);

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { form_response: { newField: 'value' } },
      });
    });

    it('deve atualizar occurrenceLocation quando fornecido', async () => {
      const updateDto: UpdateReportDto = {
        occurrenceLocation: { latitude: -23.5505, longitude: -46.6333 },
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.report, 'update')
        .mockResolvedValue(mockReport as any);

      await service.update(1, updateDto, 1);

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { occurrence_location: updateDto.occurrenceLocation },
      });
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateDto: UpdateReportDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.report, 'update')
        .mockResolvedValue({ ...mockReport, active: false } as any);

      await service.update(1, updateDto, 1);

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve validar participation e formVersion quando fornecidos', async () => {
      const updateDto: UpdateReportDto = {
        participationId: 2,
        formVersionId: 2,
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue({ id: 2 } as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue({ id: 2 } as any);
      jest
        .spyOn(prismaService.report, 'update')
        .mockResolvedValue(mockReport as any);

      await service.update(1, updateDto, 1);

      expect(prismaService.participation.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(prismaService.form_version.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateReportDto = {
        reportType: 'NEGATIVE',
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(null);

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando participation não existe', async () => {
      const updateDto: UpdateReportDto = {
        participationId: 999,
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando formVersion não existe', async () => {
      const updateDto: UpdateReportDto = {
        formVersionId: 999,
      };

      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.update(1, updateDto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve deletar report permanentemente', async () => {
      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);
      jest
        .spyOn(prismaService.report, 'delete')
        .mockResolvedValue(mockReport as any);

      await service.remove(1, 1);

      expect(prismaService.report.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest
        .spyOn(prismaService.report, 'findUnique')
        .mockResolvedValue(mockReportWithParticipation as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('participationId', 1);
      expect(result).toHaveProperty('formVersionId', 1);
      expect(result).toHaveProperty('reportType', 'POSITIVE');
    });
  });
});

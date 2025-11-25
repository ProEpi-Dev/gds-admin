import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsPointsQueryDto } from './dto/reports-points-query.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaService: PrismaService;

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

  const mockParticipation = {
    id: 1,
    user_id: 1,
    context_id: 1,
  };

  const mockFormVersion = {
    id: 1,
    form_id: 1,
    version_number: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: {
            report: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            participation: {
              findUnique: jest.fn(),
            },
            form_version: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

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

      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.form_version, 'findUnique').mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.report, 'create').mockResolvedValue(mockReport as any);

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve validar participation e formVersion', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.form_version, 'findUnique').mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.report, 'create').mockResolvedValue(mockReport as any);

      await service.create(createDto);

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

      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.form_version, 'findUnique').mockResolvedValue(mockFormVersion as any);
      jest.spyOn(prismaService.report, 'create').mockResolvedValue(mockReport as any);

      await service.create(createDto);

      expect(prismaService.report.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          occurrence_location: createDto.occurrenceLocation,
        }),
      });
    });

    it('deve lançar BadRequestException quando participation não existe', async () => {
      const createDto: CreateReportDto = {
        participationId: 999,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando formVersion não existe', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 999,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.form_version, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: ReportQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([mockReport] as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(1);

      const result = await service.findAll(query);

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

      await service.findAll(query);

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

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue(reportsWithLocation as any);

      const result = await service.findPoints(query);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('latitude', -23.5505);
      expect(result[0]).toHaveProperty('longitude', -46.6333);
    });

    it('deve filtrar por período corretamente', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);

      await service.findPoints(query);

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('deve filtrar por formId quando fornecido', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        formId: 1,
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);

      await service.findPoints(query);

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

      await service.findPoints(query);

      expect(prismaService.report.findMany).toHaveBeenCalled();
    });

    it('deve filtrar apenas reports ativos', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(prismaService.report, 'findMany').mockResolvedValue([] as any);

      await service.findPoints(query);

      expect(prismaService.report.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar report quando existe', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateDto: UpdateReportDto = {
        reportType: 'NEGATIVE',
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.report, 'update').mockResolvedValue({
        ...mockReport,
        report_type: 'NEGATIVE',
      } as any);

      const result = await service.update(1, updateDto);

      expect(result).toHaveProperty('reportType', 'NEGATIVE');
    });

    it('deve atualizar formResponse quando fornecido', async () => {
      const updateDto: UpdateReportDto = {
        formResponse: { newField: 'value' },
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.report, 'update').mockResolvedValue(mockReport as any);

      await service.update(1, updateDto);

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { form_response: { newField: 'value' } },
      });
    });

    it('deve atualizar occurrenceLocation quando fornecido', async () => {
      const updateDto: UpdateReportDto = {
        occurrenceLocation: { latitude: -23.5505, longitude: -46.6333 },
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.report, 'update').mockResolvedValue(mockReport as any);

      await service.update(1, updateDto);

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { occurrence_location: updateDto.occurrenceLocation },
      });
    });

    it('deve validar participation e formVersion quando fornecidos', async () => {
      const updateDto: UpdateReportDto = {
        participationId: 2,
        formVersionId: 2,
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue({ id: 2 } as any);
      jest.spyOn(prismaService.form_version, 'findUnique').mockResolvedValue({ id: 2 } as any);
      jest.spyOn(prismaService.report, 'update').mockResolvedValue(mockReport as any);

      await service.update(1, updateDto);

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

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando participation não existe', async () => {
      const updateDto: UpdateReportDto = {
        participationId: 999,
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.participation, 'findUnique').mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando formVersion não existe', async () => {
      const updateDto: UpdateReportDto = {
        formVersionId: 999,
      };

      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.form_version, 'findUnique').mockResolvedValue(null);

      await expect(service.update(1, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve desativar report', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);
      jest.spyOn(prismaService.report, 'update').mockResolvedValue({
        ...mockReport,
        active: false,
      } as any);

      await service.remove(1);

      expect(prismaService.report.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest.spyOn(prismaService.report, 'findUnique').mockResolvedValue(mockReport as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('participationId', 1);
      expect(result).toHaveProperty('formVersionId', 1);
      expect(result).toHaveProperty('reportType', 'POSITIVE');
    });
  });
});


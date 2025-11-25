import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsPointsQueryDto } from './dto/reports-points-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { ReportPointResponseDto } from './dto/report-point-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;

  const mockReport: ReportResponseDto = {
    id: 1,
    participationId: 1,
    formVersionId: 1,
    reportType: 'POSITIVE',
    occurrenceLocation: { latitude: -23.5505, longitude: -46.6333 },
    formResponse: {},
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<ReportResponseDto> = {
    data: [mockReport],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/reports?page=1&pageSize=20',
      last: '/v1/reports?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  const mockPoints: ReportPointResponseDto[] = [
    {
      latitude: -23.5505,
      longitude: -46.6333,
      reportType: 'POSITIVE',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findPoints: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
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

      jest.spyOn(reportsService, 'create').mockResolvedValue(mockReport);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockReport);
      expect(reportsService.create).toHaveBeenCalledWith(createDto);
    });

    it('deve lançar BadRequestException quando participation não existe', async () => {
      const createDto: CreateReportDto = {
        participationId: 999,
        formVersionId: 1,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest
        .spyOn(reportsService, 'create')
        .mockRejectedValue(new BadRequestException('Participação não encontrada'));

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando formVersion não existe', async () => {
      const createDto: CreateReportDto = {
        participationId: 1,
        formVersionId: 999,
        reportType: 'POSITIVE',
        formResponse: {},
      };

      jest
        .spyOn(reportsService, 'create')
        .mockRejectedValue(new BadRequestException('Versão do formulário não encontrada'));

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: ReportQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(reportsService, 'findAll').mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
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

      jest.spyOn(reportsService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(reportsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findPoints', () => {
    it('deve retornar pontos com latitude/longitude', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(reportsService, 'findPoints').mockResolvedValue(mockPoints);

      const result = await controller.findPoints(query);

      expect(result).toEqual(mockPoints);
      expect(result[0]).toHaveProperty('latitude');
      expect(result[0]).toHaveProperty('longitude');
    });

    it('deve filtrar por período', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(reportsService, 'findPoints').mockResolvedValue(mockPoints);

      await controller.findPoints(query);

      expect(reportsService.findPoints).toHaveBeenCalledWith(query);
    });

    it('deve filtrar por formId', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        formId: 1,
      };

      jest.spyOn(reportsService, 'findPoints').mockResolvedValue(mockPoints);

      await controller.findPoints(query);

      expect(reportsService.findPoints).toHaveBeenCalledWith(query);
    });

    it('deve filtrar por formReference', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        formReference: 'TEST_FORM',
      };

      jest.spyOn(reportsService, 'findPoints').mockResolvedValue(mockPoints);

      await controller.findPoints(query);

      expect(reportsService.findPoints).toHaveBeenCalledWith(query);
    });

    it('deve filtrar apenas reports ativos', async () => {
      const query: ReportsPointsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      jest.spyOn(reportsService, 'findPoints').mockResolvedValue(mockPoints);

      await controller.findPoints(query);

      expect(reportsService.findPoints).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar report quando existe', async () => {
      jest.spyOn(reportsService, 'findOne').mockResolvedValue(mockReport);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockReport);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(reportsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Report não encontrado'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar report com sucesso', async () => {
      const updateDto: UpdateReportDto = {
        reportType: 'NEGATIVE',
      };

      const updatedReport = { ...mockReport, reportType: 'NEGATIVE' as const };
      jest.spyOn(reportsService, 'update').mockResolvedValue(updatedReport);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedReport);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateReportDto = {
        reportType: 'NEGATIVE',
      };

      jest
        .spyOn(reportsService, 'update')
        .mockRejectedValue(new NotFoundException('Report não encontrado'));

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('deve validar participation e formVersion quando fornecidos', async () => {
      const updateDto: UpdateReportDto = {
        participationId: 2,
        formVersionId: 2,
      };

      const updatedReport = { ...mockReport, participationId: 2, formVersionId: 2 };
      jest.spyOn(reportsService, 'update').mockResolvedValue(updatedReport);

      await controller.update(1, updateDto);

      expect(reportsService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe('remove', () => {
    it('deve desativar report', async () => {
      jest.spyOn(reportsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(reportsService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(reportsService, 'remove')
        .mockRejectedValue(new NotFoundException('Report não encontrado'));

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});


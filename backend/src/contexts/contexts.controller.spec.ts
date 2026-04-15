import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContextsController } from './contexts.controller';
import { ContextsService } from './contexts.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextQueryDto } from './dto/context-query.dto';
import { ContextResponseDto } from './dto/context-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { RolesGuard } from '../authz/guards/roles.guard';
import { ReportStreakQueryDto } from '../reports/dto/report-streak-query.dto';
import { ParticipationReportStreakQueryDto } from '../reports/dto/participation-report-streak-query.dto';

describe('ContextsController', () => {
  let controller: ContextsController;
  let contextsService: ContextsService;

  const mockContext: ContextResponseDto = {
    id: 1,
    name: 'Test Context',
    locationId: 1,
    description: 'Test Description',
    type: 'TEST',
    accessType: 'PUBLIC',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    modules: ['self_health'],
  };

  const mockListResponse: ListResponseDto<ContextResponseDto> = {
    data: [mockContext],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/contexts?page=1&pageSize=20',
      last: '/v1/contexts?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextsController],
      providers: [
        {
          provide: ContextsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findPublicForSignup: jest.fn(),
            findReportStreaks: jest.fn(),
            findParticipationReportStreak: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findConfiguration: jest.fn(),
            upsertConfiguration: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<ContextsController>(ContextsController);
    contextsService = module.get<ContextsService>(ContextsService);
  });

  describe('create', () => {
    it('deve criar contexto com sucesso', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        active: true,
      };

      jest.spyOn(contextsService, 'create').mockResolvedValue(mockContext);

      const result = await controller.create(createContextDto);

      expect(result).toEqual(mockContext);
      expect(contextsService.create).toHaveBeenCalledWith(createContextDto);
    });

    it('deve lançar BadRequestException quando location não existe', async () => {
      const createContextDto: CreateContextDto = {
        name: 'Test Context',
        accessType: 'PUBLIC',
        locationId: 999,
      };

      jest
        .spyOn(contextsService, 'create')
        .mockRejectedValue(
          new BadRequestException('Localização não encontrada'),
        );

      await expect(controller.create(createContextDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      jest
        .spyOn(contextsService, 'findPublicForSignup')
        .mockResolvedValue(mockListResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockListResponse);
      expect(contextsService.findPublicForSignup).toHaveBeenCalled();
    });

    it('deve chamar findPublicForSignup (lista pública para login)', async () => {
      jest
        .spyOn(contextsService, 'findPublicForSignup')
        .mockResolvedValue(mockListResponse);

      await controller.findAll();

      expect(contextsService.findPublicForSignup).toHaveBeenCalledWith();
    });
  });

  describe('findConfiguration', () => {
    it('deve delegar ao serviço', async () => {
      const rows = [
        {
          id: 1,
          key: 'negative_report_dedup_window_min',
          value: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      jest
        .spyOn(contextsService, 'findConfiguration')
        .mockResolvedValue(rows as any);

      const result = await controller.findConfiguration(1);

      expect(result).toEqual(rows);
      expect(contextsService.findConfiguration).toHaveBeenCalledWith(1);
    });
  });

  describe('upsertConfiguration', () => {
    it('deve delegar ao serviço', async () => {
      const entry = {
        id: 1,
        key: 'negative_report_dedup_window_min',
        value: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest
        .spyOn(contextsService, 'upsertConfiguration')
        .mockResolvedValue(entry as any);

      const result = await controller.upsertConfiguration(1, 'negative_report_dedup_window_min', {
        value: 90,
      });

      expect(result).toEqual(entry);
      expect(contextsService.upsertConfiguration).toHaveBeenCalledWith(
        1,
        'negative_report_dedup_window_min',
        90,
      );
    });

    it('deve rejeitar chave com caracteres inválidos', async () => {
      jest.mocked(contextsService.upsertConfiguration).mockClear();
      await expect(
        controller.upsertConfiguration(1, 'Invalid Key!', { value: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(contextsService.upsertConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar contexto quando existe', async () => {
      jest.spyOn(contextsService, 'findOne').mockResolvedValue(mockContext);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockContext);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(contextsService, 'findOne')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findReportStreaks', () => {
    it('deve retornar lista paginada de ofensivas', async () => {
      const query: ReportStreakQueryDto = {
        page: 1,
        pageSize: 20,
      };
      const user = { userId: 10 };
      const expected = {
        data: [],
        meta: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
        links: {
          first: '',
          last: '',
          prev: null,
          next: null,
        },
      };

      jest
        .spyOn(contextsService, 'findReportStreaks')
        .mockResolvedValue(expected as any);

      const result = await controller.findReportStreaks(1, query, user);

      expect(result).toEqual(expected);
      expect(contextsService.findReportStreaks).toHaveBeenCalledWith(
        1,
        query,
        10,
      );
    });
  });

  describe('findParticipationReportStreak', () => {
    it('deve retornar detalhes da ofensiva da participação', async () => {
      const query: ParticipationReportStreakQueryDto = {
        startDate: '2026-03-01',
        endDate: '2026-03-31',
      };
      const user = { userId: 10 };
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
        .spyOn(contextsService, 'findParticipationReportStreak')
        .mockResolvedValue(expected as any);

      const result = await controller.findParticipationReportStreak(
        1,
        1,
        query,
        user,
      );

      expect(result).toEqual(expected);
      expect(
        contextsService.findParticipationReportStreak,
      ).toHaveBeenCalledWith(1, 1, query, 10);
    });
  });

  describe('update', () => {
    it('deve atualizar contexto com sucesso', async () => {
      const updateContextDto: UpdateContextDto = {
        name: 'Updated Context',
      };

      const updatedContext = { ...mockContext, name: 'Updated Context' };
      jest.spyOn(contextsService, 'update').mockResolvedValue(updatedContext);

      const result = await controller.update(1, updateContextDto);

      expect(result).toEqual(updatedContext);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateContextDto: UpdateContextDto = {
        name: 'Updated Context',
      };

      jest
        .spyOn(contextsService, 'update')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.update(999, updateContextDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando location não existe', async () => {
      const updateContextDto: UpdateContextDto = {
        locationId: 999,
      };

      jest
        .spyOn(contextsService, 'update')
        .mockRejectedValue(
          new BadRequestException('Localização não encontrada'),
        );

      await expect(controller.update(1, updateContextDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve desativar contexto', async () => {
      jest.spyOn(contextsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(contextsService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(contextsService, 'remove')
        .mockRejectedValue(new NotFoundException('Contexto não encontrado'));

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui participações', async () => {
      jest
        .spyOn(contextsService, 'remove')
        .mockRejectedValue(
          new BadRequestException('Contexto possui participações'),
        );

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando possui formulários', async () => {
      jest
        .spyOn(contextsService, 'remove')
        .mockRejectedValue(
          new BadRequestException('Contexto possui formulários'),
        );

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});

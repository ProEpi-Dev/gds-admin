import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ParticipationsService } from './participations.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { UpdateParticipationDto } from './dto/update-participation.dto';
import { ParticipationQueryDto } from './dto/participation-query.dto';

describe('ParticipationsService', () => {
  let service: ParticipationsService;
  let prismaService: PrismaService;

  const mockParticipation = {
    id: 1,
    user_id: 1,
    context_id: 1,
    start_date: new Date('2024-01-01'),
    end_date: null,
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockContext = {
    id: 1,
    name: 'Test Context',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipationsService,
        {
          provide: PrismaService,
          useValue: {
            participation: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            context: {
              findUnique: jest.fn(),
            },
            report: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ParticipationsService>(ParticipationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('deve criar participação com sucesso', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 1,
        contextId: 1,
        startDate: '2024-01-01',
        active: true,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(prismaService.participation, 'create')
        .mockResolvedValue(mockParticipation as any);

      const result = await service.create(createParticipationDto);

      expect(result).toHaveProperty('id', 1);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.context.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve validar user e context', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 1,
        contextId: 1,
        startDate: '2024-01-01',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(prismaService.participation, 'create')
        .mockResolvedValue(mockParticipation as any);

      await service.create(createParticipationDto);

      expect(prismaService.user.findUnique).toHaveBeenCalled();
      expect(prismaService.context.findUnique).toHaveBeenCalled();
    });

    it('deve validar datas', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 1,
        contextId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(prismaService.participation, 'create')
        .mockResolvedValue(mockParticipation as any);

      await service.create(createParticipationDto);

      expect(prismaService.participation.create).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando endDate < startDate', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 1,
        contextId: 1,
        startDate: '2024-01-02',
        endDate: '2024-01-01',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);

      await expect(service.create(createParticipationDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando user não existe', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 999,
        contextId: 1,
        startDate: '2024-01-01',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createParticipationDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando context não existe', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 1,
        contextId: 999,
        startDate: '2024-01-01',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.create(createParticipationDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: ParticipationQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValue([mockParticipation] as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
    });

    it('deve aplicar filtros corretamente', async () => {
      const query: ParticipationQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        userId: 1,
        contextId: 1,
      };

      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValue([] as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.participation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
            user_id: 1,
            context_id: 1,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar participação quando existe', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.participation, 'update').mockResolvedValue({
        ...mockParticipation,
        active: false,
      } as any);

      const result = await service.update(1, updateParticipationDto);

      expect(result).toHaveProperty('active', false);
    });

    it('deve validar user e context quando fornecidos', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        userId: 2,
        contextId: 2,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ id: 2 } as any);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue({ id: 2 } as any);
      jest
        .spyOn(prismaService.participation, 'update')
        .mockResolvedValue(mockParticipation as any);

      await service.update(1, updateParticipationDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(prismaService.context.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });

    it('deve atualizar startDate quando fornecido', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        startDate: '2024-02-01',
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.participation, 'update')
        .mockResolvedValue(mockParticipation as any);

      await service.update(1, updateParticipationDto);

      expect(prismaService.participation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { start_date: expect.any(Date) },
      });
    });

    it('deve atualizar endDate quando fornecido como null', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        endDate: null,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.participation, 'update')
        .mockResolvedValue(mockParticipation as any);

      await service.update(1, updateParticipationDto);

      expect(prismaService.participation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { end_date: null },
      });
    });

    it('deve atualizar endDate quando fornecido como data', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        endDate: '2024-12-31',
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.participation, 'update')
        .mockResolvedValue(mockParticipation as any);

      await service.update(1, updateParticipationDto);

      expect(prismaService.participation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { end_date: expect.any(Date) },
      });
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.participation, 'update')
        .mockResolvedValue(mockParticipation as any);

      await service.update(1, updateParticipationDto);

      expect(prismaService.participation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve validar datas', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.participation, 'update')
        .mockResolvedValue(mockParticipation as any);

      await service.update(1, updateParticipationDto);

      expect(prismaService.participation.update).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.update(999, updateParticipationDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando endDate < startDate', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        startDate: '2024-01-02',
        endDate: '2024-01-01',
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);

      await expect(service.update(1, updateParticipationDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deve desativar participação', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.participation, 'update').mockResolvedValue({
        ...mockParticipation,
        active: false,
      } as any);

      await service.remove(1);

      expect(prismaService.participation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui reports', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest.spyOn(prismaService.report, 'count').mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('userId', 1);
      expect(result).toHaveProperty('contextId', 1);
      expect(result).toHaveProperty('startDate');
    });
  });
});

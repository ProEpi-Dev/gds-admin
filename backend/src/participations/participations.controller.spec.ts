import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ParticipationsController } from './participations.controller';
import { ParticipationsService } from './participations.service';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { UpdateParticipationDto } from './dto/update-participation.dto';
import { ParticipationQueryDto } from './dto/participation-query.dto';
import { ParticipationResponseDto } from './dto/participation-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('ParticipationsController', () => {
  let controller: ParticipationsController;
  let participationsService: ParticipationsService;

  const mockParticipation: ParticipationResponseDto = {
    id: 1,
    userId: 1,
    contextId: 1,
    startDate: new Date('2024-01-01'),
    endDate: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<ParticipationResponseDto> = {
    data: [mockParticipation],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/participations?page=1&pageSize=20',
      last: '/v1/participations?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParticipationsController],
      providers: [
        {
          provide: ParticipationsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ParticipationsController>(ParticipationsController);
    participationsService = module.get<ParticipationsService>(
      ParticipationsService,
    );
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
        .spyOn(participationsService, 'create')
        .mockResolvedValue(mockParticipation);

      const result = await controller.create(createParticipationDto);

      expect(result).toEqual(mockParticipation);
      expect(participationsService.create).toHaveBeenCalledWith(
        createParticipationDto,
      );
    });

    it('deve lançar BadRequestException quando user não existe', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 999,
        contextId: 1,
        startDate: '2024-01-01',
      };

      jest
        .spyOn(participationsService, 'create')
        .mockRejectedValue(new BadRequestException('Usuário não encontrado'));

      await expect(controller.create(createParticipationDto)).rejects.toThrow(
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
        .spyOn(participationsService, 'create')
        .mockRejectedValue(new BadRequestException('Contexto não encontrado'));

      await expect(controller.create(createParticipationDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando endDate < startDate', async () => {
      const createParticipationDto: CreateParticipationDto = {
        userId: 1,
        contextId: 1,
        startDate: '2024-01-02',
        endDate: '2024-01-01',
      };

      jest
        .spyOn(participationsService, 'create')
        .mockRejectedValue(
          new BadRequestException(
            'Data de término deve ser posterior à data de início',
          ),
        );

      await expect(controller.create(createParticipationDto)).rejects.toThrow(
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
        .spyOn(participationsService, 'findAll')
        .mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
    });

    it('deve filtrar por active, userId e contextId', async () => {
      const query: ParticipationQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        userId: 1,
        contextId: 1,
      };

      jest
        .spyOn(participationsService, 'findAll')
        .mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(participationsService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar participação quando existe', async () => {
      jest
        .spyOn(participationsService, 'findOne')
        .mockResolvedValue(mockParticipation);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockParticipation);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(participationsService, 'findOne')
        .mockRejectedValue(
          new NotFoundException('Participação não encontrada'),
        );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar participação com sucesso', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        active: false,
      };

      const updatedParticipation = { ...mockParticipation, active: false };
      jest
        .spyOn(participationsService, 'update')
        .mockResolvedValue(updatedParticipation);

      const result = await controller.update(1, updateParticipationDto);

      expect(result).toEqual(updatedParticipation);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        active: false,
      };

      jest
        .spyOn(participationsService, 'update')
        .mockRejectedValue(
          new NotFoundException('Participação não encontrada'),
        );

      await expect(
        controller.update(999, updateParticipationDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando endDate < startDate', async () => {
      const updateParticipationDto: UpdateParticipationDto = {
        startDate: '2024-01-02',
        endDate: '2024-01-01',
      };

      jest
        .spyOn(participationsService, 'update')
        .mockRejectedValue(
          new BadRequestException(
            'Data de término deve ser posterior à data de início',
          ),
        );

      await expect(
        controller.update(1, updateParticipationDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve desativar participação', async () => {
      jest.spyOn(participationsService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(participationsService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(participationsService, 'remove')
        .mockRejectedValue(
          new NotFoundException('Participação não encontrada'),
        );

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando possui reports', async () => {
      jest
        .spyOn(participationsService, 'remove')
        .mockRejectedValue(
          new BadRequestException('Participação possui reports'),
        );

      await expect(controller.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});

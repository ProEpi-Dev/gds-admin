import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GendersController } from './genders.controller';
import { GendersService } from './genders.service';
import { CreateGenderDto } from './dto/create-gender.dto';
import { UpdateGenderDto } from './dto/update-gender.dto';
import { GenderResponseDto } from './dto/gender-response.dto';

describe('GendersController', () => {
  let controller: GendersController;
  let gendersService: GendersService;

  const mockGender: GenderResponseDto = {
    id: 1,
    name: 'Masculino',
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GendersController],
      providers: [
        {
          provide: GendersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GendersController>(GendersController);
    gendersService = module.get<GendersService>(GendersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar lista de gêneros', async () => {
      const mockGenders = [mockGender];
      jest.spyOn(gendersService, 'findAll').mockResolvedValue(mockGenders);

      const result = await controller.findAll();

      expect(result).toEqual(mockGenders);
      expect(gendersService.findAll).toHaveBeenCalledWith(true);
    });

    it('deve passar activeOnly quando fornecido', async () => {
      jest.spyOn(gendersService, 'findAll').mockResolvedValue([]);

      await controller.findAll('false');

      expect(gendersService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('findOne', () => {
    it('deve retornar gênero quando existe', async () => {
      jest.spyOn(gendersService, 'findOne').mockResolvedValue(mockGender);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockGender);
      expect(gendersService.findOne).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(gendersService, 'findOne')
        .mockRejectedValue(new NotFoundException('Gênero não encontrado'));

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('deve criar gênero com sucesso', async () => {
      const createDto: CreateGenderDto = {
        name: 'Novo Gênero',
      };

      jest.spyOn(gendersService, 'create').mockResolvedValue(mockGender);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockGender);
      expect(gendersService.create).toHaveBeenCalledWith(createDto);
    });

    it('deve lançar BadRequestException quando nome já existe', async () => {
      const createDto: CreateGenderDto = {
        name: 'Gênero Existente',
      };

      jest
        .spyOn(gendersService, 'create')
        .mockRejectedValue(new BadRequestException('Já existe um gênero com esse nome'));

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('deve atualizar gênero com sucesso', async () => {
      const updateDto: UpdateGenderDto = {
        name: 'Gênero Atualizado',
      };

      const updatedGender = { ...mockGender, name: 'Gênero Atualizado' };
      jest.spyOn(gendersService, 'update').mockResolvedValue(updatedGender);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedGender);
      expect(gendersService.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateDto: UpdateGenderDto = {
        name: 'Gênero Atualizado',
      };

      jest
        .spyOn(gendersService, 'update')
        .mockRejectedValue(new NotFoundException('Gênero não encontrado'));

      await expect(controller.update('999', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando nome já existe', async () => {
      const updateDto: UpdateGenderDto = {
        name: 'Gênero Existente',
      };

      jest
        .spyOn(gendersService, 'update')
        .mockRejectedValue(new BadRequestException('Já existe um gênero com esse nome'));

      await expect(controller.update('1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve deletar gênero com sucesso', async () => {
      jest.spyOn(gendersService, 'remove').mockResolvedValue(undefined);

      await controller.remove('1');

      expect(gendersService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(gendersService, 'remove')
        .mockRejectedValue(new NotFoundException('Gênero não encontrado'));

      await expect(controller.remove('999')).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando há usuários associados', async () => {
      jest
        .spyOn(gendersService, 'remove')
        .mockRejectedValue(
          new BadRequestException(
            'Não é possível deletar o gênero pois existem usuários associados',
          ),
        );

      await expect(controller.remove('1')).rejects.toThrow(BadRequestException);
    });
  });
});

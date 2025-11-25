import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser: UserResponseDto = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockListResponse: ListResponseDto<UserResponseDto> = {
    data: [mockUser],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/users?page=1&pageSize=20',
      last: '/v1/users?page=1&pageSize=20',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
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

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('deve criar usuário com sucesso', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        active: true,
      };

      jest.spyOn(usersService, 'create').mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('deve lançar ConflictException quando email já existe', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      jest
        .spyOn(usersService, 'create')
        .mockRejectedValue(new ConflictException('Email já está em uso'));

      await expect(controller.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de usuários', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(usersService, 'findAll').mockResolvedValue(mockListResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockListResponse);
      expect(usersService.findAll).toHaveBeenCalledWith(query);
    });

    it('deve filtrar por active quando fornecido', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
      };

      jest.spyOn(usersService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(usersService.findAll).toHaveBeenCalledWith(query);
    });

    it('deve filtrar por search quando fornecido', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
        search: 'test',
      };

      jest.spyOn(usersService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(usersService.findAll).toHaveBeenCalledWith(query);
    });

    it('deve retornar apenas ativos por padrão', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(usersService, 'findAll').mockResolvedValue(mockListResponse);

      await controller.findAll(query);

      expect(usersService.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário quando existe', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(usersService, 'findOne')
        .mockRejectedValue(new NotFoundException('Usuário não encontrado'));

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar usuário com sucesso', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, name: 'Updated Name' };
      jest.spyOn(usersService, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update(1, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      jest
        .spyOn(usersService, 'update')
        .mockRejectedValue(new NotFoundException('Usuário não encontrado'));

      await expect(controller.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException quando email já está em uso', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      jest
        .spyOn(usersService, 'update')
        .mockRejectedValue(new ConflictException('Email já está em uso'));

      await expect(controller.update(1, updateUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve desativar usuário (soft delete)', async () => {
      jest.spyOn(usersService, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(usersService.remove).toHaveBeenCalledWith(1);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest
        .spyOn(usersService, 'remove')
        .mockRejectedValue(new NotFoundException('Usuário não encontrado'));

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});


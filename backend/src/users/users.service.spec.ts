import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('deve criar usuário com senha hasheada', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        active: true,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser as any);

      const result = await service.create(createUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          password: 'hashedPassword',
          active: true,
        },
      });
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('deve lançar ConflictException quando email já existe', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it('deve definir active como true por padrão', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest.spyOn(prismaService.user, 'create').mockResolvedValue(mockUser as any);

      await service.create(createUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          password: 'hashedPassword',
          active: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([mockUser] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
      expect(result.data).toHaveLength(1);
      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(prismaService.user.count).toHaveBeenCalled();
    });

    it('deve aplicar filtros corretamente', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
        active: false,
        search: 'test',
      };

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: 'test',
                  mode: 'insensitive',
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('deve retornar apenas ativos por padrão', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('deve fazer busca case insensitive', async () => {
      const query: UserQueryDto = {
        page: 1,
        pageSize: 20,
        search: 'TEST',
      };

      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  mode: 'insensitive',
                }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário quando existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      } as any);

      const result = await service.update(1, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name' },
      });
      expect(result).toHaveProperty('name', 'Updated Name');
    });

    it('deve atualizar email quando fornecido', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'updated@example.com',
      };

      jest.spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(null);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser as any);

      await service.update(1, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { email: 'updated@example.com' },
      });
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateUserDto: UpdateUserDto = {
        active: false,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser as any);

      await service.update(1, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve hash senha quando fornecida', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'newPassword123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue(mockUser as any);

      await service.update(1, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newHashedPassword' },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException quando email já está em uso', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      jest.spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({ id: 2, email: 'existing@example.com' } as any);

      await expect(service.update(1, updateUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve desativar usuário', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        active: false,
      } as any);

      await service.remove(1);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        active: true,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
    });
  });
});


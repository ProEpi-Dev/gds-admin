import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import { ParticipationProfileExtraService } from '../participation-profile-extra/participation-profile-extra.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AcceptLegalDocumentsDto } from './dto/accept-legal-documents.dto';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../auth/constants/password.constants';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  let legalDocumentsService: LegalDocumentsService;
  let getProfileExtraCompletionMock: jest.Mock;

  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword',
    gender_id: null,
    location_id: null,
    external_identifier: null,
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    getProfileExtraCompletionMock = jest
      .fn()
      .mockResolvedValue({ required: false, complete: true });

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
              delete: jest.fn(),
              count: jest.fn(),
            },
            gender: {
              findUnique: jest.fn(),
            },
            location: {
              findUnique: jest.fn(),
            },
            user_legal_acceptance: {
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
            participation: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            role: {
              findUnique: jest.fn(),
            },
            context: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AuthzService,
          useValue: {
            isAdmin: jest.fn().mockResolvedValue(true),
            getManagedContextIds: jest.fn().mockResolvedValue([1]),
          },
        },
        {
          provide: LegalDocumentsService,
          useValue: {
            findActive: jest.fn(),
            validateDocumentIds: jest.fn(),
          },
        },
        {
          provide: ParticipationProfileExtraService,
          useValue: {
            getProfileExtraCompletion: (...args: unknown[]) =>
              getProfileExtraCompletionMock(...args),
          },
        },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    legalDocumentsService = module.get<LegalDocumentsService>(
      LegalDocumentsService,
    );
  });

  describe('create', () => {
    it('deve criar usuário com senha hasheada', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        active: true,
      };

      const mockUserWithRole = {
        ...mockUser,
        role: { id: 1, name: 'admin' },
      };
      (prismaService.user.findUnique as jest.Mock).mockImplementation(
        (args: any) =>
          args.where.email
            ? Promise.resolve(null)
            : Promise.resolve(mockUserWithRole),
      );
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUser as any);

      const result = await service.create(createUserDto, 1);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        BCRYPT_ROUNDS,
      );
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

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto, 1)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
    });

    it('deve incluir role_id quando admin cria usuário com roleId', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Manager User',
        email: 'manager@example.com',
        password: 'pass',
        active: true,
        roleId: 2,
      };
      const mockUserWithRole = {
        ...mockUser,
        id: 2,
        email: 'manager@example.com',
        role: { id: 2, name: 'manager' },
      };
      (prismaService.user.findUnique as jest.Mock).mockImplementation(
        (args: any) =>
          args.where.email
            ? Promise.resolve(null)
            : Promise.resolve({ ...mockUserWithRole, id: 2 }),
      );
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        ...mockUserWithRole,
        id: 2,
      });

      const result = await service.create(createUserDto, 1);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role_id: 2,
          name: 'Manager User',
          email: 'manager@example.com',
        }),
      });
      expect(result.id).toBe(2);
    });

    it('deve definir active como true por padrão', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUserWithRole = {
        ...mockUser,
        role: { id: 1, name: 'admin' },
      };
      (prismaService.user.findUnique as jest.Mock).mockImplementation(
        (args: any) =>
          args.where.email
            ? Promise.resolve(null)
            : Promise.resolve(mockUserWithRole),
      );
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(mockUser as any);

      await service.create(createUserDto, 1);

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

      jest
        .spyOn(prismaService.user, 'findMany')
        .mockResolvedValue([mockUser] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(1);

      const result = await service.findAll(query, 1);

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

      await service.findAll(query, 1);

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

      await service.findAll(query, 1);

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

      await service.findAll(query, 1);

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

    it('deve retornar vazio quando participante sem contextos geridos e search não é o próprio email', async () => {
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.getManagedContextIds as jest.Mock).mockResolvedValue([]);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ email: 'me@example.com' } as any);
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1, pageSize: 20, search: 'other@example.com' },
        1,
      );

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
    });

    it('deve retornar apenas o próprio usuário quando participante busca pelo próprio email', async () => {
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.getManagedContextIds as jest.Mock).mockResolvedValue([]);
      const selfUser = {
        ...mockUser,
        email: 'me@example.com',
        role: { id: 1, name: 'participant' },
      };
      (prismaService.user.findUnique as jest.Mock).mockImplementation(
        (args: any) =>
          args.select?.email !== undefined
            ? Promise.resolve({ email: 'me@example.com' })
            : Promise.resolve(selfUser),
      );
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([selfUser] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, pageSize: 20, search: 'me@example.com' },
        1,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('me@example.com');
    });
  });

  describe('findAdmins', () => {
    it('deve retornar lista vazia quando não existe role admin', async () => {
      jest.spyOn(prismaService.role, 'findUnique').mockResolvedValue(null);

      const result = await service.findAdmins({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalItems).toBe(0);
      expect(prismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('deve retornar admins quando role admin existe', async () => {
      const adminRole = { id: 1, code: 'admin' };
      const adminUser = {
        ...mockUser,
        role_id: 1,
        role: { id: 1, name: 'Administrador' },
      };
      jest
        .spyOn(prismaService.role, 'findUnique')
        .mockResolvedValue(adminRole as any);
      jest.spyOn(prismaService.user, 'findMany').mockResolvedValue([adminUser] as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(1);

      const result = await service.findAdmins({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role_id: 1 },
          include: { role: { select: { id: true, name: true } } },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário quando existe', async () => {
      const mockUserWithRole = {
        ...mockUser,
        role: { id: 1, name: 'admin' },
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUserWithRole as any);

      const result = await service.findOne(1, 1);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 999 } }),
      );
    });

    it('deve lançar NotFoundException quando não-admin e usuário não tem participação nos contextos gerenciados', async () => {
      const authz = moduleRef.get<AuthzService>(AuthzService);
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.getManagedContextIds as jest.Mock).mockResolvedValue([1]);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({
          ...mockUser,
          role: { id: 2, name: 'participant' },
        } as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);

      await expect(service.findOne(2, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos fornecidos', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUserWithRole = {
        ...mockUser,
        name: 'Updated Name',
        role: { id: 1, name: 'admin' },
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(updatedUserWithRole as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      } as any);

      const result = await service.update(1, updateUserDto, 1);

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

      const updatedUserWithRole = {
        ...mockUser,
        email: 'updated@example.com',
        role: { id: 1, name: 'admin' },
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedUserWithRole as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(mockUser as any);

      await service.update(1, updateUserDto, 1);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { email: 'updated@example.com' },
      });
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateUserDto: UpdateUserDto = {
        active: false,
      };

      const updatedUserWithRole = {
        ...mockUser,
        active: false,
        role: { id: 1, name: 'admin' },
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(updatedUserWithRole as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(mockUser as any);

      await service.update(1, updateUserDto, 1);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve hash senha quando fornecida', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'newPassword123',
      };

      const updatedUserWithRole = {
        ...mockUser,
        role: { id: 1, name: 'admin' },
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(updatedUserWithRole as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(mockUser as any);

      await service.update(1, updateUserDto, 1);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', BCRYPT_ROUNDS);
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

      await expect(service.update(999, updateUserDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException quando email já está em uso', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({ id: 2, email: 'existing@example.com' } as any);

      await expect(service.update(1, updateUserDto, 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve lançar NotFoundException quando não-admin atualiza usuário sem participação nos seus contextos', async () => {
      const authz = moduleRef.get(AuthzService) as any;
      (authz.isAdmin as jest.Mock).mockResolvedValue(false);
      (authz.getManagedContextIds as jest.Mock).mockResolvedValue([1]);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        id: 2,
        email: 'other@example.com',
      } as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);

      await expect(
        service.update(2, { name: 'Other' }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException quando admin tenta remover sua própria administração', async () => {
      (moduleRef.get(AuthzService) as any).isAdmin.mockResolvedValue(true);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ ...mockUser, id: 1, role_id: 1 } as any);

      await expect(
        service.update(1, { roleId: null }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException ao remover último administrador', async () => {
      (moduleRef.get(AuthzService) as any).isAdmin.mockResolvedValue(true);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ ...mockUser, id: 2, role_id: 1 } as any);
      jest
        .spyOn(prismaService.role, 'findUnique')
        .mockResolvedValue({ id: 1, code: 'admin' } as any);
      jest.spyOn(prismaService.user, 'count').mockResolvedValue(1);

      await expect(
        service.update(2, { roleId: null }, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deve desativar usuário ativo (soft delete)', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        active: false,
      } as any);

      await service.remove(1, 1);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });

    it('deve excluir permanentemente usuário inativo', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(inactiveUser as any);
      jest
        .spyOn(prismaService.user, 'delete')
        .mockResolvedValue(inactiveUser as any);

      await service.remove(1, 1);

      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar BadRequestException quando exclusão permanente falha por dependências', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(inactiveUser as any);
      const prismaError = new Error('Foreign key constraint failed') as any;
      prismaError.code = 'P2003';
      jest.spyOn(prismaService.user, 'delete').mockRejectedValue(prismaError);

      await expect(service.remove(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar NotFoundException quando não-admin remove usuário sem participação nos seus contextos', async () => {
      (moduleRef.get(AuthzService) as any).isAdmin.mockResolvedValue(false);
      (moduleRef.get(AuthzService) as any).getManagedContextIds.mockResolvedValue(
        [1],
      );
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        id: 2,
      } as any);
      jest.spyOn(prismaService.participation, 'count').mockResolvedValue(0);

      await expect(service.remove(2, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToResponseDto', () => {
    it('deve mapear todos os campos corretamente', async () => {
      const mockUserWithRole = {
        ...mockUser,
        role_id: 1,
        role: { id: 1, name: 'admin' },
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUserWithRole as any);

      const result = await service.findOne(1, 1);

      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        active: true,
        genderId: null,
        locationId: null,
        countryLocationId: null,
        externalIdentifier: null,
        phone: null,
        roleId: 1,
        roleName: 'admin',
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
    });
  });

  describe('getProfileStatus', () => {
    it('deve retornar perfil incompleto quando faltam campos', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('genderId');
      expect(result.missingFields).toContain('locationId');
      expect(result.missingFields).toContain('externalIdentifier');
      expect(result.profileExtraRequired).toBe(false);
      expect(result.profileExtraComplete).toBe(true);
    });

    it('deve retornar perfil completo quando todos campos preenchidos', async () => {
      const completeUser = {
        ...mockUser,
        gender_id: 1,
        location_id: 150,
        external_identifier: '12345678900',
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(completeUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.profile.genderId).toBe(1);
      expect(result.profile.locationId).toBe(150);
      expect(result.profile.externalIdentifier).toBe('12345678900');
      expect(result.profileExtraRequired).toBe(false);
      expect(result.profileExtraComplete).toBe(true);
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfileStatus(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve incluir profileExtra em missingFields quando obrigatório e incompleto', async () => {
      const completeUser = {
        ...mockUser,
        gender_id: 1,
        location_id: 150,
        external_identifier: '12345678900',
      };
      getProfileExtraCompletionMock.mockResolvedValue({
        required: true,
        complete: false,
      });
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(completeUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('profileExtra');
      expect(result.profileExtraRequired).toBe(true);
      expect(result.profileExtraComplete).toBe(false);
    });

    it('deve manter perfil completo quando profile_extra obrigatório e preenchido', async () => {
      const completeUser = {
        ...mockUser,
        gender_id: 1,
        location_id: 150,
        external_identifier: '12345678900',
      };
      getProfileExtraCompletionMock.mockResolvedValue({
        required: true,
        complete: true,
      });
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(completeUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.profileExtraRequired).toBe(true);
      expect(result.profileExtraComplete).toBe(true);
    });

    it('deve acumular profileExtra com campos base faltantes', async () => {
      getProfileExtraCompletionMock.mockResolvedValue({
        required: true,
        complete: false,
      });
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('genderId');
      expect(result.missingFields).toContain('profileExtra');
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar perfil com sucesso', async () => {
      const updateProfileDto: UpdateProfileDto = {
        genderId: 1,
        locationId: 150,
        externalIdentifier: '12345678900',
      };

      const mockGender = { id: 1, name: 'Masculino', active: true };
      const mockLocation = { id: 150, name: 'São Paulo', active: true };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.gender, 'findUnique')
        .mockResolvedValue(mockGender as any);
      jest
        .spyOn(prismaService.location, 'findUnique')
        .mockResolvedValue(mockLocation as any);
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        gender_id: 1,
        location_id: 150,
        external_identifier: '12345678900',
      } as any);

      const result = await service.updateProfile(1, updateProfileDto);

      expect(result.genderId).toBe(1);
      expect(result.locationId).toBe(150);
      expect(result.externalIdentifier).toBe('12345678900');
    });

    it('deve lançar BadRequestException quando genderId inválido', async () => {
      const updateProfileDto: UpdateProfileDto = {
        genderId: 999,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.gender, 'findUnique').mockResolvedValue(null);

      await expect(service.updateProfile(1, updateProfileDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando locationId inválido', async () => {
      const updateProfileDto: UpdateProfileDto = {
        locationId: 999,
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(null);

      await expect(service.updateProfile(1, updateProfileDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptLegalDocuments', () => {
    it('deve aceitar documentos legais com sucesso', async () => {
      const acceptDto: AcceptLegalDocumentsDto = {
        legalDocumentIds: [1, 2],
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(legalDocumentsService, 'validateDocumentIds')
        .mockResolvedValue(true);
      jest
        .spyOn(prismaService.user_legal_acceptance, 'upsert')
        .mockResolvedValue({} as any);

      await service.acceptLegalDocuments(
        1,
        acceptDto,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(legalDocumentsService.validateDocumentIds).toHaveBeenCalledWith([
        1, 2,
      ]);
      expect(prismaService.user_legal_acceptance.upsert).toHaveBeenCalledTimes(
        2,
      );
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      const acceptDto: AcceptLegalDocumentsDto = {
        legalDocumentIds: [1, 2],
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.acceptLegalDocuments(999, acceptDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLegalAcceptanceStatus', () => {
    it('deve retornar documentos pendentes quando não aceitos', async () => {
      const mockActiveDocuments = [
        {
          id: 1,
          typeCode: 'TERMS_OF_USE',
          typeName: 'Termos de Uso',
          version: '1.0',
          title: 'Termos de Uso',
          isRequired: true,
        },
        {
          id: 2,
          typeCode: 'PRIVACY_POLICY',
          typeName: 'Política de Privacidade',
          version: '1.0',
          title: 'Política de Privacidade',
          isRequired: true,
        },
      ];

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(legalDocumentsService, 'findActive')
        .mockResolvedValue(mockActiveDocuments as any);
      jest
        .spyOn(prismaService.user_legal_acceptance, 'findMany')
        .mockResolvedValue([]);

      const result = await service.getLegalAcceptanceStatus(1);

      expect(result.needsAcceptance).toBe(true);
      expect(result.pendingDocuments).toHaveLength(2);
      expect(result.acceptedDocuments).toHaveLength(0);
    });

    it('deve retornar sem pendências quando todos aceitos', async () => {
      const mockActiveDocuments = [
        {
          id: 1,
          typeCode: 'TERMS_OF_USE',
          typeName: 'Termos de Uso',
          version: '1.0',
          title: 'Termos de Uso',
          isRequired: true,
        },
      ];

      const mockAcceptances = [
        {
          id: 1,
          user_id: 1,
          legal_document_id: 1,
          accepted_at: new Date(),
          legal_document: {
            id: 1,
            legal_document_type: {
              code: 'TERMS_OF_USE',
              name: 'Termos de Uso',
            },
          },
        },
      ];

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(legalDocumentsService, 'findActive')
        .mockResolvedValue(mockActiveDocuments as any);
      jest
        .spyOn(prismaService.user_legal_acceptance, 'findMany')
        .mockResolvedValue(mockAcceptances as any);

      const result = await service.getLegalAcceptanceStatus(1);

      expect(result.needsAcceptance).toBe(false);
      expect(result.pendingDocuments).toHaveLength(0);
      expect(result.acceptedDocuments).toHaveLength(1);
    });
  });

  describe('getUserRole', () => {
    it('deve retornar isManager=true quando usuário é manager de um contexto', async () => {
      const asManagerByRole = [
        { context_id: 1, participation_role: [{ role: { code: 'manager' } }] },
        { context_id: 2, participation_role: [{ role: { code: 'manager' } }] },
      ];
      const participations = [{ context_id: 3 }];

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ role: { code: 'user' } } as any);
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValueOnce(asManagerByRole as any)
        .mockResolvedValueOnce(participations as any);
      jest.spyOn(prismaService.context, 'findMany').mockResolvedValue([
        { id: 1, name: 'C1' },
        { id: 2, name: 'C2' },
        { id: 3, name: 'C3' },
      ] as any);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(true);
      expect(result.isParticipant).toBe(true);
      expect(result.contexts.asManager).toEqual([
        { id: 1, name: 'C1' },
        { id: 2, name: 'C2' },
      ]);
      expect(result.contexts.asParticipant).toEqual([{ id: 3, name: 'C3' }]);
    });

    it('deve retornar isManager=false quando usuário não é manager', async () => {
      const participations = [{ context_id: 1 }];

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ role: { code: 'user' } } as any);
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(participations as any);
      jest
        .spyOn(prismaService.context, 'findMany')
        .mockResolvedValue([{ id: 1, name: 'C1' }] as any);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(false);
      expect(result.isParticipant).toBe(true);
      expect(result.contexts.asManager).toEqual([]);
      expect(result.contexts.asParticipant).toEqual([{ id: 1, name: 'C1' }]);
    });

    it('deve retornar isParticipant=false quando usuário não é participante', async () => {
      const asManagerByRole = [
        { context_id: 1, participation_role: [{ role: { code: 'manager' } }] },
      ];

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ role: { code: 'user' } } as any);
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValueOnce(asManagerByRole as any)
        .mockResolvedValueOnce([]);
      jest
        .spyOn(prismaService.context, 'findMany')
        .mockResolvedValue([{ id: 1, name: 'C1' }] as any);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(true);
      expect(result.isParticipant).toBe(false);
      expect(result.contexts.asManager).toEqual([{ id: 1, name: 'C1' }]);
      expect(result.contexts.asParticipant).toEqual([]);
    });

    it('deve retornar ambos false quando usuário não tem contextos', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue({ role: { code: 'user' } } as any);
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(false);
      expect(result.isParticipant).toBe(false);
      expect(result.contexts.asManager).toEqual([]);
      expect(result.contexts.asParticipant).toEqual([]);
    });
  });
});

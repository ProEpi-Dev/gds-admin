import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AcceptLegalDocumentsDto } from './dto/accept-legal-documents.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let legalDocumentsService: LegalDocumentsService;

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
            context_manager: {
              findMany: jest.fn(),
            },
            participation: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: LegalDocumentsService,
          useValue: {
            findActive: jest.fn(),
            validateDocumentIds: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    legalDocumentsService = module.get<LegalDocumentsService>(LegalDocumentsService);
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
    it('deve desativar usuário ativo (soft delete)', async () => {
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
      expect(prismaService.user.delete).not.toHaveBeenCalled();
    });

    it('deve excluir permanentemente usuário inativo', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(inactiveUser as any);
      jest.spyOn(prismaService.user, 'delete').mockResolvedValue(inactiveUser as any);

      await service.remove(1);

      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(prismaService.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('deve lançar BadRequestException quando exclusão permanente falha por dependências', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(inactiveUser as any);
      const prismaError = new Error('Foreign key constraint failed') as any;
      prismaError.code = 'P2003';
      jest.spyOn(prismaService.user, 'delete').mockRejectedValue(prismaError);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
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
        genderId: null,
        locationId: null,
        externalIdentifier: null,
        createdAt: mockUser.created_at,
        updatedAt: mockUser.updated_at,
      });
    });
  });

  describe('getProfileStatus', () => {
    it('deve retornar perfil incompleto quando faltam campos', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('genderId');
      expect(result.missingFields).toContain('locationId');
      expect(result.missingFields).toContain('externalIdentifier');
    });

    it('deve retornar perfil completo quando todos campos preenchidos', async () => {
      const completeUser = {
        ...mockUser,
        gender_id: 1,
        location_id: 150,
        external_identifier: '12345678900',
      };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(completeUser as any);

      const result = await service.getProfileStatus(1);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.profile.genderId).toBe(1);
      expect(result.profile.locationId).toBe(150);
      expect(result.profile.externalIdentifier).toBe('12345678900');
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfileStatus(999)).rejects.toThrow(NotFoundException);
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

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.gender, 'findUnique').mockResolvedValue(mockGender as any);
      jest.spyOn(prismaService.location, 'findUnique').mockResolvedValue(mockLocation as any);
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

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.gender, 'findUnique').mockResolvedValue(null);

      await expect(service.updateProfile(1, updateProfileDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando locationId inválido', async () => {
      const updateProfileDto: UpdateProfileDto = {
        locationId: 999,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
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

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(legalDocumentsService, 'validateDocumentIds').mockResolvedValue(true);
      jest.spyOn(prismaService.user_legal_acceptance, 'upsert').mockResolvedValue({} as any);

      await service.acceptLegalDocuments(1, acceptDto, '127.0.0.1', 'Mozilla/5.0');

      expect(legalDocumentsService.validateDocumentIds).toHaveBeenCalledWith([1, 2]);
      expect(prismaService.user_legal_acceptance.upsert).toHaveBeenCalledTimes(2);
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

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(legalDocumentsService, 'findActive').mockResolvedValue(mockActiveDocuments as any);
      jest.spyOn(prismaService.user_legal_acceptance, 'findMany').mockResolvedValue([]);

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

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      jest.spyOn(legalDocumentsService, 'findActive').mockResolvedValue(mockActiveDocuments as any);
      jest.spyOn(prismaService.user_legal_acceptance, 'findMany').mockResolvedValue(mockAcceptances as any);

      const result = await service.getLegalAcceptanceStatus(1);

      expect(result.needsAcceptance).toBe(false);
      expect(result.pendingDocuments).toHaveLength(0);
      expect(result.acceptedDocuments).toHaveLength(1);
    });
  });

  describe('getUserRole', () => {
    it('deve retornar isManager=true quando usuário é manager de um contexto', async () => {
      const mockContextManagers = [
        { context_id: 1 },
        { context_id: 2 },
      ];
      const mockParticipations = [
        { context_id: 3 },
      ];

      jest.spyOn(prismaService.context_manager, 'findMany').mockResolvedValue(mockContextManagers as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue(mockParticipations as any);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(true);
      expect(result.isParticipant).toBe(true);
      expect(result.contexts.asManager).toEqual([1, 2]);
      expect(result.contexts.asParticipant).toEqual([3]);
    });

    it('deve retornar isManager=false quando usuário não é manager', async () => {
      const mockParticipations = [
        { context_id: 1 },
      ];

      jest.spyOn(prismaService.context_manager, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue(mockParticipations as any);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(false);
      expect(result.isParticipant).toBe(true);
      expect(result.contexts.asManager).toEqual([]);
      expect(result.contexts.asParticipant).toEqual([1]);
    });

    it('deve retornar isParticipant=false quando usuário não é participante', async () => {
      const mockContextManagers = [
        { context_id: 1 },
      ];

      jest.spyOn(prismaService.context_manager, 'findMany').mockResolvedValue(mockContextManagers as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(true);
      expect(result.isParticipant).toBe(false);
      expect(result.contexts.asManager).toEqual([1]);
      expect(result.contexts.asParticipant).toEqual([]);
    });

    it('deve retornar ambos false quando usuário não tem contextos', async () => {
      jest.spyOn(prismaService.context_manager, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);

      const result = await service.getUserRole(1);

      expect(result.isManager).toBe(false);
      expect(result.isParticipant).toBe(false);
      expect(result.contexts.asManager).toEqual([]);
      expect(result.contexts.asParticipant).toEqual([]);
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AcceptLegalDocumentsDto } from './dto/accept-legal-documents.dto';

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
            getProfileStatus: jest.fn(),
            updateProfile: jest.fn(),
            getLegalAcceptanceStatus: jest.fn(),
            acceptLegalDocuments: jest.fn(),
            getUserRole: jest.fn(),
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

      await expect(controller.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
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

      await expect(controller.update(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException quando email já está em uso', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'existing@example.com',
      };

      jest
        .spyOn(usersService, 'update')
        .mockRejectedValue(new ConflictException('Email já está em uso'));

      await expect(controller.update(1, updateUserDto)).rejects.toThrow(
        ConflictException,
      );
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

  describe('getProfileStatus', () => {
    it('deve retornar status do perfil quando completo', async () => {
      const mockUser = { userId: 1 };
      const mockProfileStatus = {
        isComplete: true,
        missingFields: [],
        profile: mockUser,
      };

      jest
        .spyOn(usersService, 'getProfileStatus')
        .mockResolvedValue(mockProfileStatus as any);

      const result = await controller.getProfileStatus(mockUser);

      expect(result).toEqual(mockProfileStatus);
      expect(usersService.getProfileStatus).toHaveBeenCalledWith(1);
    });

    it('deve retornar status do perfil quando incompleto', async () => {
      const mockUser = { userId: 1 };
      const mockProfileStatus = {
        isComplete: false,
        missingFields: ['gender_id', 'location_id'],
        profile: mockUser,
      };

      jest
        .spyOn(usersService, 'getProfileStatus')
        .mockResolvedValue(mockProfileStatus as any);

      const result = await controller.getProfileStatus(mockUser);

      expect(result).toEqual(mockProfileStatus);
      expect(usersService.getProfileStatus).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar perfil com sucesso', async () => {
      const currentUser = { userId: 1 };
      const updateProfileDto: UpdateProfileDto = {
        genderId: 1,
        locationId: 1,
        externalIdentifier: 'EXT123',
      };

      jest.spyOn(usersService, 'updateProfile').mockResolvedValue(mockUser);

      const result = await controller.updateProfile(
        currentUser,
        updateProfileDto,
      );

      expect(result).toEqual(mockUser);
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        1,
        updateProfileDto,
      );
    });
  });

  describe('getLegalAcceptanceStatus', () => {
    it('deve retornar status de aceite dos documentos legais', async () => {
      const mockUser = { userId: 1 };
      const mockLegalStatus = {
        needsAcceptance: false,
        pendingDocuments: [],
        acceptedDocuments: [
          {
            id: 1,
            typeCode: 'TERMS_OF_USE',
            typeName: 'Termos de Uso',
            version: '1.0',
            title: 'Termos de Uso da Plataforma',
            acceptedAt: new Date(),
          },
        ],
      };

      jest
        .spyOn(usersService, 'getLegalAcceptanceStatus')
        .mockResolvedValue(mockLegalStatus);

      const result = await controller.getLegalAcceptanceStatus(mockUser);

      expect(result).toEqual(mockLegalStatus);
      expect(usersService.getLegalAcceptanceStatus).toHaveBeenCalledWith(1);
    });

    it('deve retornar documentos pendentes quando necessário', async () => {
      const mockUser = { userId: 1 };
      const mockLegalStatus = {
        needsAcceptance: true,
        pendingDocuments: [
          {
            id: 2,
            typeCode: 'PRIVACY_POLICY',
            typeName: 'Política de Privacidade',
            version: '2.0',
            title: 'Política de Privacidade',
          },
        ],
        acceptedDocuments: [],
      };

      jest
        .spyOn(usersService, 'getLegalAcceptanceStatus')
        .mockResolvedValue(mockLegalStatus);

      const result = await controller.getLegalAcceptanceStatus(mockUser);

      expect(result).toEqual(mockLegalStatus);
      expect(usersService.getLegalAcceptanceStatus).toHaveBeenCalledWith(1);
    });
  });

  describe('acceptLegalDocuments', () => {
    it('deve aceitar documentos legais com sucesso', async () => {
      const mockUser = { userId: 1 };
      const mockRequest: any = {
        ip: '192.168.1.1',
      };
      const acceptDto: AcceptLegalDocumentsDto = {
        legalDocumentIds: [1, 2],
      };
      const userAgent = 'Mozilla/5.0';

      jest
        .spyOn(usersService, 'acceptLegalDocuments')
        .mockResolvedValue(undefined);

      await controller.acceptLegalDocuments(
        mockUser,
        acceptDto,
        mockRequest,
        userAgent,
      );

      expect(usersService.acceptLegalDocuments).toHaveBeenCalledWith(
        1,
        acceptDto,
        '192.168.1.1',
        'Mozilla/5.0',
      );
    });
  });

  describe('getUserRole', () => {
    it('deve retornar papel do usuário como manager', async () => {
      const mockUser = { userId: 1 };
      const mockUserRole = {
        isManager: true,
        isParticipant: false,
        contexts: {
          asManager: [1],
          asParticipant: [],
        },
      };

      jest.spyOn(usersService, 'getUserRole').mockResolvedValue(mockUserRole);

      const result = await controller.getUserRole(mockUser);

      expect(result).toEqual(mockUserRole);
      expect(usersService.getUserRole).toHaveBeenCalledWith(1);
    });

    it('deve retornar papel do usuário como participant', async () => {
      const mockUser = { userId: 1 };
      const mockUserRole = {
        isManager: false,
        isParticipant: true,
        contexts: {
          asManager: [],
          asParticipant: [2],
        },
      };

      jest.spyOn(usersService, 'getUserRole').mockResolvedValue(mockUserRole);

      const result = await controller.getUserRole(mockUser);

      expect(result).toEqual(mockUserRole);
      expect(usersService.getUserRole).toHaveBeenCalledWith(1);
    });

    it('deve retornar papel do usuário como ambos', async () => {
      const mockUser = { userId: 1 };
      const mockUserRole = {
        isManager: true,
        isParticipant: true,
        contexts: {
          asManager: [1],
          asParticipant: [2],
        },
      };

      jest.spyOn(usersService, 'getUserRole').mockResolvedValue(mockUserRole);

      const result = await controller.getUserRole(mockUser);

      expect(result).toEqual(mockUserRole);
      expect(usersService.getUserRole).toHaveBeenCalledWith(1);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SignupDto } from './dto/signup.dto';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let legalDocumentsService: LegalDocumentsService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockParticipation = {
    id: 1,
    user_id: 1,
    context_id: 1,
    start_date: new Date('2024-01-01'),
    end_date: null,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    context: {
      id: 1,
      name: 'Test Context',
    },
  };

  const mockForm = {
    id: 1,
    title: 'Test Form',
    reference: 'DEFAULT_SIGNAL_FORM',
    active: true,
    form_version: [
      {
        id: 1,
        form_id: 1,
        version_number: 1,
        access_type: 'PUBLIC',
        definition: {},
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            participation: {
              findMany: jest.fn(),
            },
            form: {
              findMany: jest.fn(),
            },
            context: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mockToken'),
          },
        },
        {
          provide: LegalDocumentsService,
          useValue: {
            validateDocumentIds: jest.fn(),
            validateRequiredDocuments: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    legalDocumentsService = module.get<LegalDocumentsService>(
      LegalDocumentsService,
    );
  });

  describe('validateUser', () => {
    it('deve retornar usuário quando credenciais são válidas', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(loginDto.email, loginDto.password);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
    });

    it('deve retornar null quando usuário não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('deve retornar null quando usuário está inativo', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(inactiveUser as any);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('deve retornar null quando senha está incorreta', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongPassword');

      expect(result).toBeNull();
    });

    it('deve lançar UnauthorizedException quando usuário não tem senha', async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(userWithoutPassword as any);

      await expect(service.validateUser('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('deve retornar token e dados do usuário', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('participation');
      expect(result).toHaveProperty('defaultForms');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando credenciais são inválidas', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('deve retornar participação ativa quando existe', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeParticipation = {
        ...mockParticipation,
        start_date: new Date(today.getTime() - 86400000), // Yesterday
        end_date: null,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([activeParticipation] as any);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.participation).not.toBeNull();
      expect(result.participation?.id).toBe(1);
    });

    it('deve retornar null quando não há participação ativa', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.participation).toBeNull();
    });

    it('deve retornar formulários padrão', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([mockForm] as any);

      const result = await service.login(loginDto);

      expect(result.defaultForms).toBeDefined();
      expect(Array.isArray(result.defaultForms)).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('deve alterar senha quando dados são válidos', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password
        .mockResolvedValueOnce(false); // new password different
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      } as any);

      await service.changePassword(1, changePasswordDto);

      expect(prismaService.user.update).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 10);
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.changePassword(1, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar UnauthorizedException quando senha atual está incorreta', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar BadRequestException quando nova senha é igual à atual', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'oldPassword',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password
        .mockResolvedValueOnce(true); // new password same

      await expect(service.changePassword(1, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
      contextId: 1,
      acceptedLegalDocumentIds: [1, 2],
    };

    it('deve criar usuário com sucesso', async () => {
      const mockContext = {
        id: 1,
        name: 'Public Context',
        access_type: 'PUBLIC',
        active: true,
      };

      const mockNewUser = {
        id: 2,
        name: 'New User',
        email: 'newuser@example.com',
        password: 'hashedPassword',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockNewParticipation = {
        id: 2,
        user_id: 2,
        context_id: 1,
        start_date: new Date(),
        end_date: null,
        active: true,
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(mockContext as any);
      jest.spyOn(legalDocumentsService, 'validateDocumentIds').mockResolvedValue(true);
      jest.spyOn(legalDocumentsService, 'validateRequiredDocuments').mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      
      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockNewUser),
          },
          participation: {
            create: jest.fn().mockResolvedValue(mockNewParticipation),
          },
          user_legal_acceptance: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.signup(signupDto);

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.participation.contextId).toBe(1);
    });

    it('deve lançar ConflictException se email já existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('deve lançar ForbiddenException se contexto não é público', async () => {
      const privateContext = {
        id: 1,
        access_type: 'PRIVATE',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(privateContext as any);

      await expect(service.signup(signupDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateToken', () => {
    it('deve gerar token válido com payload correto', () => {
      const token = service.generateToken(mockUser);

      expect(token).toBe('mockToken');
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
      });
    });
  });
});


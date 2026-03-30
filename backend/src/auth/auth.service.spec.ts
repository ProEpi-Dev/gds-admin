import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SignupDto } from './dto/signup.dto';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import { getLoggerToken } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from './constants/password.constants';

const mockPinoLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  verbose: jest.fn(),
};

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let legalDocumentsService: LegalDocumentsService;
  let mailService: MailService;
  let configService: ConfigService;

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
              findFirst: jest.fn(),
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
            user_refresh_token: {
              create: jest.fn().mockResolvedValue({ id: 1 }),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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
            findByTypeCode: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:5173';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return undefined;
            }),
          },
        },
        {
          provide: getLoggerToken(AuthService.name),
          useValue: mockPinoLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    legalDocumentsService = module.get<LegalDocumentsService>(
      LegalDocumentsService,
    );
    mailService = module.get<MailService>(MailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateUser', () => {
    it('deve retornar usuário quando credenciais são válidas', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        loginDto.email,
        loginDto.password,
      );

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
    });

    it('deve retornar null quando usuário não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('deve retornar null quando usuário está inativo', async () => {
      const inactiveUser = { ...mockUser, active: false };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(inactiveUser as any);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('deve retornar null quando senha está incorreta', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongPassword',
      );

      expect(result).toBeNull();
    });

    it('deve lançar UnauthorizedException quando usuário não tem senha', async () => {
      const userWithoutPassword = { ...mockUser, password: null };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(userWithoutPassword as any);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve re-hashear senha no login quando cost do hash for diferente de BCRYPT_ROUNDS (migração)', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.getRounds as jest.Mock).mockReturnValue(10);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashCost11');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        password: 'newHashCost11',
      } as any);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', BCRYPT_ROUNDS);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'newHashCost11' },
      });
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
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('participation');
      expect(result).toHaveProperty('defaultForms');
      expect(jwtService.sign).toHaveBeenCalled();
      expect(prismaService.user_refresh_token.create).toHaveBeenCalled();
    });

    it('deve calcular expiração do refresh com JWT_REFRESH_EXPIRES_IN (ex.: 30m)', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30m';
        return undefined;
      });

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      await service.login(loginDto);

      const createArg = (prismaService.user_refresh_token.create as jest.Mock)
        .mock.calls[0][0];
      expect(createArg.data.expires_at).toBeInstanceOf(Date);
      expect(createArg.data.expires_at.getTime()).toBeGreaterThan(Date.now());
    });

    it('deve calcular expiração do refresh com unidade ms (ex.: 3600000ms)', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '3600000ms';
        return undefined;
      });

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      await service.login(loginDto);

      const createArg = (prismaService.user_refresh_token.create as jest.Mock)
        .mock.calls[0][0];
      expect(createArg.data.expires_at).toBeInstanceOf(Date);
    });

    it('deve lançar UnauthorizedException quando credenciais são inválidas', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
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
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValue([activeParticipation] as any);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.participation).not.toBeNull();
      expect(result.participation?.id).toBe(1);
    });

    it('deve retornar null quando participação tem start_date no futuro', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setMinutes(0);
      tomorrow.setSeconds(0);
      tomorrow.setMilliseconds(0);

      const futureStartParticipation = {
        ...mockParticipation,
        start_date: tomorrow,
        end_date: null,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValue([futureStartParticipation] as any);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.participation).toBeNull();
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
      jest
        .spyOn(prismaService.form, 'findMany')
        .mockResolvedValue([mockForm] as any);

      const result = await service.login(loginDto);

      expect(result.defaultForms).toBeDefined();
      expect(Array.isArray(result.defaultForms)).toBe(true);
    });

    it('deve retornar participação quando end_date é futura', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      today.setMinutes(0);
      today.setSeconds(0);
      today.setMilliseconds(0);

      const futureEnd = new Date(today);
      futureEnd.setDate(futureEnd.getDate() + 30);

      const participationWithEnd = {
        ...mockParticipation,
        start_date: new Date(today.getTime() - 86400000),
        end_date: futureEnd,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.participation, 'findMany')
        .mockResolvedValue([participationWithEnd] as any);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.participation).not.toBeNull();
      expect(result.participation?.id).toBe(1);
    });

    it('deve falhar no login quando JWT_REFRESH_EXPIRES_IN é inválido', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return 'valor-invalido';
        return undefined;
      });

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      jest.spyOn(prismaService.participation, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.form, 'findMany').mockResolvedValue([]);

      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid JWT_REFRESH_EXPIRES_IN',
      );
    });
  });

  describe('changePassword', () => {
    it('deve alterar senha quando dados são válidos', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password
        .mockResolvedValueOnce(false); // new password different
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      jest.spyOn(prismaService.user, 'update').mockResolvedValue({
        ...mockUser,
        password: 'newHashedPassword',
      } as any);
      jest
        .spyOn(prismaService.user_refresh_token, 'deleteMany')
        .mockResolvedValue({ count: 0 } as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation((ops: unknown) =>
          Promise.all(ops as Promise<unknown>[]),
        );

      await service.changePassword(1, changePasswordDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
        BCRYPT_ROUNDS,
      );
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando usuário não tem senha definida', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue({
        ...mockUser,
        password: null,
      } as any);

      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow('Senha não definida');
    });

    it('deve lançar UnauthorizedException quando senha atual está incorreta', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar BadRequestException quando nova senha é igual à atual', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'oldPassword',
      };

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // current password
        .mockResolvedValueOnce(true); // new password same

      await expect(
        service.changePassword(1, changePasswordDto),
      ).rejects.toThrow(BadRequestException);
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

      const mockTermsOfUse = {
        id: 1,
        typeCode: 'TERMS_OF_USE',
        typeName: 'Termos de Uso',
        title: 'Termos de Uso',
        version: '1.0',
        content: 'Conteúdo dos termos',
        isRequired: true,
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
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(legalDocumentsService, 'validateDocumentIds')
        .mockResolvedValue(true);
      jest
        .spyOn(legalDocumentsService, 'findByTypeCode')
        .mockResolvedValue(mockTermsOfUse as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const mockParticipantRole = { id: 1, code: 'participant' };
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          return callback({
            user: {
              create: jest.fn().mockResolvedValue(mockNewUser),
            },
            participation: {
              create: jest.fn().mockResolvedValue(mockNewParticipation),
            },
            role: {
              findUnique: jest.fn().mockResolvedValue(mockParticipantRole),
            },
            participation_role: {
              create: jest.fn().mockResolvedValue({}),
            },
            user_legal_acceptance: {
              create: jest.fn().mockResolvedValue({}),
            },
          });
        });

      const result = await service.signup(signupDto);

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.participation.contextId).toBe(1);
    });

    it('deve lançar ConflictException se email já existe', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('deve lançar BadRequestException se contexto não existe', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prismaService.context, 'findUnique').mockResolvedValue(null);

      await expect(service.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signup(signupDto)).rejects.toThrow(
        'Contexto com ID 1 não encontrado',
      );
    });

    it('deve lançar ForbiddenException se contexto não é público', async () => {
      const privateContext = {
        id: 1,
        access_type: 'PRIVATE',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(privateContext as any);

      await expect(service.signup(signupDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar BadRequestException se Termo de Uso não foi aceito', async () => {
      const mockContext = {
        id: 1,
        name: 'Public Context',
        access_type: 'PUBLIC',
        active: true,
      };

      const mockTermsOfUse = {
        id: 1,
        typeCode: 'TERMS_OF_USE',
        typeName: 'Termos de Uso',
      };

      const signupWithoutTerms = {
        ...signupDto,
        acceptedLegalDocumentIds: [2], // Não inclui o ID 1 (Termo de Uso)
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prismaService.context, 'findUnique')
        .mockResolvedValue(mockContext as any);
      jest
        .spyOn(legalDocumentsService, 'validateDocumentIds')
        .mockResolvedValue(true);
      jest
        .spyOn(legalDocumentsService, 'findByTypeCode')
        .mockResolvedValue(mockTermsOfUse as any);

      await expect(service.signup(signupWithoutTerms)).rejects.toThrow(
        BadRequestException,
      );
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

  describe('requestPasswordReset', () => {
    it('deve retornar mensagem genérica sempre', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      const result = await service.requestPasswordReset('unknown@example.com');

      expect(result.message).toContain('Se o email estiver cadastrado');
    });

    it('quando usuário existe e mail está configurado, deve salvar token e enviar email', async () => {
      const userWithEmail = {
        ...mockUser,
        email: 'user@example.com',
        name: 'User',
      };
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(userWithEmail as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(userWithEmail as any);

      const result = await service.requestPasswordReset('user@example.com');

      expect(result.message).toContain('Se o email estiver cadastrado');
      expect(prismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: userWithEmail.id },
          data: expect.objectContaining({
            password_reset_token: expect.any(String),
            password_reset_expires: expect.any(Date),
          }),
        }),
      );
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Redefinição de senha'),
        }),
      );
    });

    it('quando usuário não existe, não deve chamar update nem sendMail', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await service.requestPasswordReset('nobody@example.com');

      expect(prismaService.user.update).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('deve atualizar senha e limpar token quando token é válido', async () => {
      const userWithToken = {
        ...mockUser,
        password_reset_token: 'valid-token',
        password_reset_expires: new Date(Date.now() + 3600000),
      };
      jest
        .spyOn(prismaService.user, 'findFirst')
        .mockResolvedValue(userWithToken as any);
      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(prismaService.user_refresh_token, 'deleteMany')
        .mockResolvedValue({ count: 0 } as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation((ops: unknown) =>
          Promise.all(ops as Promise<unknown>[]),
        );
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      await service.resetPassword('valid-token', 'NewPass123');

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          password_reset_token: 'valid-token',
          password_reset_expires: { gt: expect.any(Date) },
          active: true,
        },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123', BCRYPT_ROUNDS);
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithToken.id },
        data: {
          password: 'newHashedPassword',
          password_reset_token: null,
          password_reset_expires: null,
        },
      });
    });

    it('deve lançar BadRequestException quando token é inválido', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando token expirou', async () => {
      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(
        service.resetPassword('expired-token', 'NewPass123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshAccessToken', () => {
    it('deve retornar novo token e refresh quando refresh é válido', async () => {
      const row = {
        id: 99,
        user_id: 1,
        user: { ...mockUser, active: true },
      };
      jest
        .spyOn(prismaService.user_refresh_token, 'findFirst')
        .mockResolvedValue(row as any);
      jest
        .spyOn(prismaService.user_refresh_token, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.user_refresh_token, 'create')
        .mockResolvedValue({ id: 2 } as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue('newAccess');

      const result = await service.refreshAccessToken('raw-refresh-token');

      expect(result.token).toBe('newAccess');
      expect(result.refreshToken).toBeDefined();
      expect(prismaService.user_refresh_token.update).toHaveBeenCalledWith({
        where: { id: 99 },
        data: { revoked_at: expect.any(Date) },
      });
      expect(prismaService.user_refresh_token.create).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando refresh não existe', async () => {
      jest
        .spyOn(prismaService.user_refresh_token, 'findFirst')
        .mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('token-desconhecido'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando usuário está inativo', async () => {
      jest.spyOn(prismaService.user_refresh_token, 'findFirst').mockResolvedValue({
        id: 1,
        user_id: 1,
        user: { ...mockUser, active: false },
      } as any);

      await expect(service.refreshAccessToken('x')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logoutWithRefreshToken', () => {
    it('deve revogar refresh token', async () => {
      jest
        .spyOn(prismaService.user_refresh_token, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);

      await service.logoutWithRefreshToken('raw-token');

      expect(prismaService.user_refresh_token.updateMany).toHaveBeenCalledWith({
        where: {
          token_hash: expect.any(String),
          revoked_at: null,
        },
        data: { revoked_at: expect.any(Date) },
      });
    });
  });
});

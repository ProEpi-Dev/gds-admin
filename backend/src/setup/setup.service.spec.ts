import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SetupService } from './setup.service';
import { PrismaService } from '../prisma/prisma.service';
import { SetupDto } from './dto/setup.dto';
import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../auth/constants/password.constants';

jest.mock('bcrypt');

describe('SetupService', () => {
  let service: SetupService;
  let prismaService: PrismaService;

  const mockSetupDto: SetupDto = {
    managerName: 'Admin User',
    managerEmail: 'admin@example.com',
    managerPassword: 'password123',
    contextName: 'Contexto Principal',
    contextDescription: 'Contexto padrão',
  };

  const mockManager = {
    id: 1,
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'hashedPassword',
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockContext = {
    id: 1,
    name: 'Contexto Principal',
    description: 'Contexto padrão',
    access_type: 'PUBLIC',
    active: true,
  };

  const mockParticipation = { id: 1, user_id: 1, context_id: 1, active: true };
  const mockAdminRole = { id: 1, code: 'admin' };
  const mockManagerRole = { id: 2, code: 'manager' };

  function createTxMock(overrides: Record<string, any> = {}) {
    return {
      user: {
        create: jest.fn().mockResolvedValue(mockManager),
        update: jest.fn().mockResolvedValue({ ...mockManager, role_id: 1 }),
        ...overrides.user,
      },
      context: {
        create: jest.fn().mockResolvedValue(mockContext),
        ...overrides.context,
      },
      role: {
        findUnique: jest.fn().mockImplementation((arg: any) => {
          if (arg?.where?.code === 'admin') return Promise.resolve(mockAdminRole);
          if (arg?.where?.code === 'manager') return Promise.resolve(mockManagerRole);
          return Promise.resolve(null);
        }),
        ...overrides.role,
      },
      participation: {
        create: jest.fn().mockResolvedValue(mockParticipation),
        ...overrides.participation,
      },
      participation_role: {
        create: jest.fn().mockResolvedValue({}),
        ...overrides.participation_role,
      },
    };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        {
          provide: PrismaService,
          useValue: {
            context: {
              findFirst: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SetupService>(SetupService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('setup', () => {
    it('deve lançar BadRequestException quando papel manager não existe (migrações RBAC não executadas)', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const txWithoutManagerRole = createTxMock({
        role: {
          findUnique: jest.fn().mockImplementation((arg: any) => {
            if (arg?.where?.code === 'admin') return Promise.resolve(mockAdminRole);
            return Promise.resolve(null);
          }),
        },
      });

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback) => callback(txWithoutManagerRole as any));

      await expect(service.setup(mockSetupDto)).rejects.toThrow(BadRequestException);
    });

    it('deve criar contexto padrão', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback) => callback(createTxMock() as any));

      const result = await service.setup(mockSetupDto);

      expect(result).toHaveProperty(
        'message',
        'Sistema inicializado com sucesso',
      );
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('manager');
      expect(result).toHaveProperty('participationId');
    });

    it('deve criar manager padrão', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const txUser = {
        create: jest.fn().mockResolvedValue(mockManager),
        update: jest.fn().mockResolvedValue({ ...mockManager, role_id: 1 }),
      };

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback) =>
          callback(createTxMock({ user: txUser }) as any),
        );

      await service.setup(mockSetupDto);

      expect(txUser.create).toHaveBeenCalledWith({
        data: {
          name: mockSetupDto.managerName,
          email: mockSetupDto.managerEmail,
          password: 'hashedPassword',
          active: true,
        },
      });
    });

    it('deve criar participation e participation_role (manager)', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const txParticipation = { create: jest.fn().mockResolvedValue(mockParticipation) };
      const txParticipationRole = { create: jest.fn().mockResolvedValue({}) };

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback) =>
          callback(
            createTxMock({
              participation: txParticipation,
              participation_role: txParticipationRole,
            }) as any,
          ),
        );

      await service.setup(mockSetupDto);

      expect(txParticipation.create).toHaveBeenCalledWith({
        data: {
          user_id: mockManager.id,
          context_id: mockContext.id,
          start_date: expect.any(Date),
          end_date: null,
          active: true,
        },
      });
      expect(txParticipationRole.create).toHaveBeenCalled();
    });

    it('deve hash senha do manager', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback) => callback(createTxMock() as any));

      await service.setup(mockSetupDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        mockSetupDto.managerPassword,
        BCRYPT_ROUNDS,
      );
    });

    it('deve usar transação para garantir atomicidade', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const transactionSpy = jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback) => callback(createTxMock() as any));

      await service.setup(mockSetupDto);

      expect(transactionSpy).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando contexto já existe', async () => {
      jest
        .spyOn(prismaService.context, 'findFirst')
        .mockResolvedValue(mockContext as any);

      await expect(service.setup(mockSetupDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando email já existe', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockManager as any);

      await expect(service.setup(mockSetupDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

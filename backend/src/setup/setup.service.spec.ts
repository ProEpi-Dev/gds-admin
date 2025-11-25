import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SetupService } from './setup.service';
import { PrismaService } from '../prisma/prisma.service';
import { SetupDto } from './dto/setup.dto';
import * as bcrypt from 'bcrypt';

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

  const mockContextManager = {
    id: 1,
    user_id: 1,
    context_id: 1,
    active: true,
  };

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
    it('deve criar contexto padrão', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue(mockManager),
          },
          context: {
            create: jest.fn().mockResolvedValue(mockContext),
          },
          context_manager: {
            create: jest.fn().mockResolvedValue(mockContextManager),
          },
        };
        return callback(tx as any);
      });

      const result = await service.setup(mockSetupDto);

      expect(result).toHaveProperty('message', 'Sistema inicializado com sucesso');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('manager');
      expect(result).toHaveProperty('contextManager');
    });

    it('deve criar manager padrão', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const txUser = {
        create: jest.fn().mockResolvedValue(mockManager),
      };

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          user: txUser,
          context: {
            create: jest.fn().mockResolvedValue(mockContext),
          },
          context_manager: {
            create: jest.fn().mockResolvedValue(mockContextManager),
          },
        };
        return callback(tx as any);
      });

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

    it('deve criar relação context_manager', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const txContextManager = {
        create: jest.fn().mockResolvedValue(mockContextManager),
      };

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue(mockManager),
          },
          context: {
            create: jest.fn().mockResolvedValue(mockContext),
          },
          context_manager: txContextManager,
        };
        return callback(tx as any);
      });

      await service.setup(mockSetupDto);

      expect(txContextManager.create).toHaveBeenCalledWith({
        data: {
          user_id: mockManager.id,
          context_id: mockContext.id,
          active: true,
        },
      });
    });

    it('deve hash senha do manager', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue(mockManager),
          },
          context: {
            create: jest.fn().mockResolvedValue(mockContext),
          },
          context_manager: {
            create: jest.fn().mockResolvedValue(mockContextManager),
          },
        };
        return callback(tx as any);
      });

      await service.setup(mockSetupDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockSetupDto.managerPassword, 10);
    });

    it('deve usar transação para garantir atomicidade', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const transactionSpy = jest.spyOn(prismaService, '$transaction').mockImplementation(async (callback) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue(mockManager),
          },
          context: {
            create: jest.fn().mockResolvedValue(mockContext),
          },
          context_manager: {
            create: jest.fn().mockResolvedValue(mockContextManager),
          },
        };
        return callback(tx as any);
      });

      await service.setup(mockSetupDto);

      expect(transactionSpy).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando contexto já existe', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(mockContext as any);

      await expect(service.setup(mockSetupDto)).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando email já existe', async () => {
      jest.spyOn(prismaService.context, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockManager as any);

      await expect(service.setup(mockSetupDto)).rejects.toThrow(BadRequestException);
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret-key'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validate', () => {
    it('deve retornar dados do usuário quando válido', async () => {
      const payload = { sub: 1, email: 'test@example.com' };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
      });
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      const payload = { sub: 999, email: 'nonexistent@example.com' };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando usuário está inativo', async () => {
      const payload = { sub: 1, email: 'test@example.com' };
      const inactiveUser = { ...mockUser, active: false };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(inactiveUser as any);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});


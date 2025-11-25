import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  let appService: AppService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    appService = module.get<AppService>(AppService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getHealth', () => {
    it('deve retornar status connected quando banco responde', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);

      const result = await appService.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('database', 'connected');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar status error quando banco falha', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(new Error('Connection failed'));

      const result = await appService.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('database', 'error');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });

    it('deve calcular uptime corretamente', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);

      // Aguardar um pouco para garantir que há diferença de tempo
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await appService.getHealth();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.uptime).toBeLessThan(100); // Deve ser muito pequeno no teste
    });
  });
});


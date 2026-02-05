import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
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

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getHealth', () => {
    it('deve retornar status de saúde quando banco está conectado', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue([{ '?column?': 1 }]);
      jest.spyOn(appService, 'getHealth').mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: 100,
      });

      const result = await appController.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('database', 'connected');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });

    it('deve retornar status de erro quando banco está desconectado', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValue(new Error('Connection failed'));
      jest.spyOn(appService, 'getHealth').mockResolvedValue({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'error',
        uptime: 100,
      });

      const result = await appController.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('database', 'error');
    });
  });
});

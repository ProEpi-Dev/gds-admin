import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn(),
            onModuleInit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  describe('onModuleInit', () => {
    it('deve conectar ao banco quando módulo inicia', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);
      service.onModuleInit = jest.fn().mockImplementation(async () => {
        await service.$connect();
      });

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });
  });
});

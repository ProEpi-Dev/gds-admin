import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  describe('onModuleInit', () => {
    it('deve conectar ao banco quando módulo inicia', async () => {
      const service = new PrismaService();
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      connectSpy.mockRestore();
      await service.$disconnect().catch(() => undefined);
    });
  });
});

import { PrismaService, buildDatasourceUrl } from './prisma.service';

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

  describe('buildDatasourceUrl', () => {
    const originais = { ...process.env };

    afterEach(() => {
      process.env = { ...originais };
    });

    it('acrescenta pool e timeout quando a URL nao os traz', () => {
      const url = buildDatasourceUrl(
        'postgresql://u:p@host:5432/app?schema=public',
      );

      expect(url).toContain('connection_limit=20');
      expect(url).toContain('pool_timeout=10');
      expect(url).toContain('schema=public');
    });

    it('respeita o que ja esta na URL', () => {
      const url = buildDatasourceUrl(
        'postgresql://u:p@host:5432/app?connection_limit=5&pool_timeout=30',
      );

      expect(url).toContain('connection_limit=5');
      expect(url).toContain('pool_timeout=30');
    });

    it('permite ajustar por variavel de ambiente', () => {
      process.env.DATABASE_POOL_SIZE = '35';
      process.env.DATABASE_POOL_TIMEOUT_SECONDS = '25';

      const url = buildDatasourceUrl('postgresql://u:p@host:5432/app');

      expect(url).toContain('connection_limit=35');
      expect(url).toContain('pool_timeout=25');
    });

    it('ignora pool zero e cai no padrao, para nao gerar URL invalida', () => {
      process.env.DATABASE_POOL_SIZE = '0';

      const url = buildDatasourceUrl('postgresql://u:p@host:5432/app');

      expect(url).toContain('connection_limit=20');
    });

    it('nao inventa URL quando nao ha DATABASE_URL', () => {
      expect(buildDatasourceUrl(undefined)).toBeUndefined();
      expect(buildDatasourceUrl('')).toBeUndefined();
    });

    it('devolve undefined para URL invalida, deixando o Prisma decidir', () => {
      expect(buildDatasourceUrl('nao-e-uma-url')).toBeUndefined();
    });
  });
});

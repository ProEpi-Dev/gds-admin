import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MaintenanceService } from './../src/maintenance/maintenance.service';

/**
 * Exercita o MaintenanceGuard pela pilha real do Nest (guards + filtros
 * globais). A matriz de métodos do modo read_only fica nos testes unitários:
 * o único endpoint público com GET é o /health, que está no allowlist.
 */
describe('Maintenance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let maintenance: MaintenanceService;
  const createdIds: number[] = [];

  const BLOCKED_ROUTE = '/auth/forgot-password';
  const BLOCKED_BODY = { email: 'ninguem@example.com' };

  async function openWindow(
    mode: 'banner' | 'read_only' | 'full',
    endsAt: Date | null = new Date(Date.now() + 3_600_000),
  ) {
    const row = await prisma.maintenance_window.create({
      data: {
        mode,
        starts_at: new Date(Date.now() - 60_000),
        ends_at: endsAt,
        title: { pt: 'Manutenção programada', en: 'Scheduled maintenance' },
        message: { pt: 'Voltamos em uma hora', en: 'Back in an hour' },
      },
    });
    createdIds.push(row.id);
    maintenance.invalidateCache();
    return row;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    maintenance = app.get(MaintenanceService);
  });

  afterEach(async () => {
    if (createdIds.length > 0) {
      await prisma.maintenance_window.deleteMany({
        where: { id: { in: createdIds } },
      });
      createdIds.length = 0;
    }
    maintenance.invalidateCache();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem janela ativa a API responde normalmente', async () => {
    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .send(BLOCKED_BODY);

    expect(response.status).not.toBe(503);
  });

  it('modo banner não bloqueia', async () => {
    await openWindow('banner');

    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .send(BLOCKED_BODY);

    expect(response.status).not.toBe(503);
  });

  it('modo full responde 503 no envelope de erro da API', async () => {
    await openWindow('full');

    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .send(BLOCKED_BODY);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('MAINTENANCE');
    expect(response.body.error.message).toBe('Voltamos em uma hora');
    expect(response.body.error.maintenance).toEqual(
      expect.objectContaining({
        mode: 'full',
        title: 'Manutenção programada',
        endsAt: expect.any(String),
      }),
    );
  });

  it('modo read_only bloqueia mutação', async () => {
    await openWindow('read_only');

    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .send(BLOCKED_BODY);

    expect(response.status).toBe(503);
    expect(response.body.error.maintenance.mode).toBe('read_only');
  });

  it('envia Retry-After quando a janela tem fim previsto', async () => {
    await openWindow('full');

    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .send(BLOCKED_BODY);

    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('omite Retry-After quando não há previsão de retorno', async () => {
    await openWindow('full', null);

    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .send(BLOCKED_BODY);

    expect(response.status).toBe(503);
    expect(response.body.error.maintenance.endsAt).toBeNull();
    expect(response.headers['retry-after']).toBeUndefined();
  });

  it('resolve a mensagem pelo Accept-Language', async () => {
    await openWindow('full');

    const response = await request(app.getHttpServer())
      .post(BLOCKED_ROUTE)
      .set('Accept-Language', 'en-US,en;q=0.9')
      .send(BLOCKED_BODY);

    expect(response.body.error.message).toBe('Back in an hour');
    expect(response.body.error.maintenance.title).toBe('Scheduled maintenance');
  });

  describe('allowlist — sem ele o admin não sai da manutenção', () => {
    beforeEach(async () => {
      await openWindow('full');
    });

    it('health continua respondendo', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('login não é bloqueado', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ninguem@example.com', password: 'senha-errada' });

      expect(response.status).not.toBe(503);
    });

    it('refresh não é bloqueado', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'token-invalido' });

      expect(response.status).not.toBe(503);
    });
  });
});

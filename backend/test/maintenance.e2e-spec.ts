import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  let adminToken: string;
  let participantToken: string;
  const createdIds: number[] = [];

  const BLOCKED_ROUTE = '/auth/forgot-password';
  const BLOCKED_BODY = { email: 'ninguem@example.com' };

  /**
   * Token assinado direto pelo JwtService da app: torna o teste independente
   * de senha de seed. O payload replica o que a JwtStrategy espera (`sub`).
   */
  function signFor(user: { id: number; email: string }): string {
    return app.get(JwtService).sign({ sub: user.id, email: user.email });
  }

  async function findUserByGlobalRole(admin: boolean) {
    const adminRole = await prisma.role.findFirst({ where: { code: 'admin' } });
    // Papel global fica em user.role_id; participante não tem papel global —
    // o dele vem por participação, então aqui basta a ausência do papel admin.
    const user = await prisma.user.findFirst({
      where: {
        active: true,
        role_id: admin ? adminRole?.id : null,
      },
    });

    if (!user) {
      throw new Error(
        `Nenhum usuário ativo ${admin ? 'admin' : 'sem papel global'} no banco`,
      );
    }
    return user;
  }

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
    // createNestApplication() não herda o que é configurado no main.ts. Sem
    // repetir o pipe aqui, nenhuma validação de DTO rodaria e o teste passaria
    // por caminhos que não existem em produção.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    maintenance = app.get(MaintenanceService);
    adminToken = signFor(await findUserByGlobalRole(true));
    participantToken = signFor(await findUserByGlobalRole(false));
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

  describe('CRUD durante janela full — o caminho de saída da manutenção', () => {
    it('admin alcança o CRUD pelo bypass de papel', async () => {
      await openWindow('full');

      await request(app.getHttpServer())
        .get('/maintenance-windows')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('admin consegue encerrar a janela em vigor', async () => {
      const row = await openWindow('full');

      await request(app.getHttpServer())
        .patch(`/maintenance-windows/${row.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);

      const afterwards = await request(app.getHttpServer())
        .post(BLOCKED_ROUTE)
        .send(BLOCKED_BODY);

      expect(afterwards.status).not.toBe(503);
    });

    it('participante recebe 503, não 403 — a manutenção vem antes do papel', async () => {
      await openWindow('full');

      const response = await request(app.getHttpServer())
        .get('/maintenance-windows')
        .set('Authorization', `Bearer ${participantToken}`);

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('MAINTENANCE');
    });
  });

  describe('CRUD', () => {
    it('cria, lista e remove uma janela', async () => {
      const created = await request(app.getHttpServer())
        .post('/maintenance-windows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'banner',
          startsAt: '2027-01-01T00:00:00.000Z',
          endsAt: '2027-01-01T06:00:00.000Z',
          title: { pt: 'Aviso' },
          message: { pt: 'Manutenção no domingo' },
        })
        .expect(201);

      expect(created.body).toEqual(
        expect.objectContaining({
          mode: 'banner',
          active: true,
          inEffect: false,
        }),
      );

      await request(app.getHttpServer())
        .get(`/maintenance-windows/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/maintenance-windows/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/maintenance-windows/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('rejeita título sem o locale pt antes de chegar no banco', async () => {
      await request(app.getHttpServer())
        .post('/maintenance-windows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'full',
          startsAt: '2027-01-01T00:00:00.000Z',
          title: { en: 'only english' },
          message: { pt: 'Mensagem' },
        })
        .expect(400);
    });

    it('rejeita período invertido', async () => {
      await request(app.getHttpServer())
        .post('/maintenance-windows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'full',
          startsAt: '2027-01-01T06:00:00.000Z',
          endsAt: '2027-01-01T00:00:00.000Z',
          title: { pt: 'Título' },
          message: { pt: 'Mensagem' },
        })
        .expect(400);
    });

    it('exige autenticação', async () => {
      await request(app.getHttpServer())
        .get('/maintenance-windows')
        .expect(401);
    });

    it('nega participante fora de janela de manutenção', async () => {
      await request(app.getHttpServer())
        .get('/maintenance-windows')
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(403);
    });
  });
});

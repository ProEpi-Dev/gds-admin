import {
  CanActivate,
  Controller,
  Get,
  INestApplication,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { cachedForRequest, hasRequestCache } from './request-cache';
import { applyRequestCacheMiddleware } from './request-cache.middleware';

/**
 * O `app.use()` do main.ts precisa embrulhar guard e controller no mesmo escopo.
 * Se o AsyncLocalStorage não atravessar a pilha do Express/Nest, a memoização
 * degrada para no-op sem falhar nada — e nenhum teste unitário perceberia.
 */
const consulta = jest.fn();

@Injectable()
class GuardQueResolvePermissao implements CanActivate {
  async canActivate(): Promise<boolean> {
    await cachedForRequest('mesma-chave', () => {
      consulta();
      return Promise.resolve('valor');
    });
    return true;
  }
}

@Controller('exemplo')
class ExemploController {
  @Get()
  @UseGuards(GuardQueResolvePermissao)
  async handler() {
    const dentroDoEscopo = hasRequestCache();
    const valor = await cachedForRequest('mesma-chave', () => {
      consulta();
      return Promise.resolve('valor');
    });
    return { dentroDoEscopo, valor };
  }
}

describe('request-cache na pilha real do Nest', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ExemploController],
      providers: [GuardQueResolvePermissao],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mesma forma de registro usada no main.ts.
    app.use(applyRequestCacheMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    consulta.mockClear();
  });

  it('guard e controller compartilham o mesmo escopo', async () => {
    const response = await request(app.getHttpServer()).get('/exemplo');

    expect(response.status).toBe(200);
    expect(response.body.dentroDoEscopo).toBe(true);
    expect(response.body.valor).toBe('valor');
    expect(consulta).toHaveBeenCalledTimes(1);
  });

  it('requisições diferentes não compartilham nada', async () => {
    await request(app.getHttpServer()).get('/exemplo');
    await request(app.getHttpServer()).get('/exemplo');

    expect(consulta).toHaveBeenCalledTimes(2);
  });

  it('requisições concorrentes não vazam entre si', async () => {
    await Promise.all([
      request(app.getHttpServer()).get('/exemplo'),
      request(app.getHttpServer()).get('/exemplo'),
      request(app.getHttpServer()).get('/exemplo'),
    ]);

    expect(consulta).toHaveBeenCalledTimes(3);
  });
});

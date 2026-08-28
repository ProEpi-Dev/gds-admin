import {
  cachedForRequest,
  hasRequestCache,
  runWithRequestCache,
} from './request-cache';
import { applyRequestCacheMiddleware } from './request-cache.middleware';

describe('request-cache', () => {
  it('memoiza a mesma chave dentro de uma requisição', async () => {
    const factory = jest.fn().mockResolvedValue(7);

    await runWithRequestCache(async () => {
      const a = await cachedForRequest('k', factory);
      const b = await cachedForRequest('k', factory);
      expect(a).toBe(7);
      expect(b).toBe(7);
    });

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('não confunde chaves diferentes', async () => {
    const factory = jest.fn().mockResolvedValue(1);

    await runWithRequestCache(async () => {
      await cachedForRequest('a', factory);
      await cachedForRequest('b', factory);
    });

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('compartilha uma única ida ao banco entre chamadas concorrentes', async () => {
    let liberar: (v: string) => void = () => undefined;
    const factory = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          liberar = resolve;
        }),
    );

    await runWithRequestCache(async () => {
      const pendentes = Promise.all([
        cachedForRequest('k', factory),
        cachedForRequest('k', factory),
      ]);
      liberar('x');
      const [a, b] = await pendentes;
      expect(a).toBe('x');
      expect(b).toBe('x');
    });

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('não guarda falha: a chamada seguinte tenta de novo', async () => {
    const factory = jest
      .fn()
      .mockRejectedValueOnce(new Error('banco fora'))
      .mockResolvedValueOnce('ok');

    await runWithRequestCache(async () => {
      await expect(cachedForRequest('k', factory)).rejects.toThrow(
        'banco fora',
      );
      await expect(cachedForRequest('k', factory)).resolves.toBe('ok');
    });

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('isola requisições diferentes', async () => {
    const factory = jest.fn().mockResolvedValue(1);

    await runWithRequestCache(() => cachedForRequest('k', factory));
    await runWithRequestCache(() => cachedForRequest('k', factory));

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('funciona fora de requisição, sem memoizar', async () => {
    const factory = jest.fn().mockResolvedValue(3);

    expect(hasRequestCache()).toBe(false);
    await expect(cachedForRequest('k', factory)).resolves.toBe(3);
    await expect(cachedForRequest('k', factory)).resolves.toBe(3);

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('o middleware chama next() já dentro do escopo', () => {
    let dentro = false;
    const next = jest.fn(() => {
      dentro = hasRequestCache();
    });

    applyRequestCacheMiddleware({} as never, {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(dentro).toBe(true);
    expect(hasRequestCache()).toBe(false);
  });
});

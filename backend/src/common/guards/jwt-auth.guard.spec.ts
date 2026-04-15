import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    const logger = { warn: jest.fn() } as any;
    guard = new JwtAuthGuard(reflector, logger);

    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
    } as any;
  });

  describe('canActivate', () => {
    it('deve permitir acesso quando rota é pública', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('deve verificar token quando rota não é pública', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalled();
    });

    it('deve usar reflector para verificar decorator Public', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });
  });

  describe('handleRequest', () => {
    let logger: { warn: jest.Mock };

    beforeEach(() => {
      logger = { warn: jest.fn() };
      guard = new JwtAuthGuard(reflector, logger as any);
    });

    it('propaga usuário quando autenticação OK', () => {
      const u = { id: 1 };
      expect(guard.handleRequest(null, u, undefined)).toBe(u);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('relança erro quando err está definido', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/x' }),
        }),
      } as ExecutionContext;
      const boom = new Error('expired');
      expect(() =>
        guard.handleRequest(boom, false, undefined, ctx),
      ).toThrow(boom);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando user é false sem err', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'POST', path: '/api' }),
        }),
      } as ExecutionContext;
      expect(() =>
        guard.handleRequest(null, false, undefined, ctx),
      ).toThrow(UnauthorizedException);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'AUTH_FAILED',
          method: 'POST',
          url: '/api',
        }),
        expect.any(String),
      );
    });

    it('usa mensagem de info quando não há err', () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url: '/r' }),
        }),
      } as ExecutionContext;
      expect(() =>
        guard.handleRequest(
          null,
          false,
          { message: 'malformed' } as Error,
          ctx,
        ),
      ).toThrow(UnauthorizedException);
    });
  });
});

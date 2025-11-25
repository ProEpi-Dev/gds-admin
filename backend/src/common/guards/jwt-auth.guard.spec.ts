import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
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

    guard = new JwtAuthGuard(reflector);

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
      const superCanActivateSpy = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalled();
    });

    it('deve usar reflector para verificar decorator Public', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });
  });
});


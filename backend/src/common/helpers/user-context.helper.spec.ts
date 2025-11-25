import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getUserContext } from './user-context.helper';

describe('UserContextHelper', () => {
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      context_manager: {
        findFirst: jest.fn(),
      },
    } as any;
  });

  describe('getUserContext', () => {
    it('deve retornar context_id quando existe', async () => {
      const mockContextManager = {
        context_id: 1,
        user_id: 1,
        active: true,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContext(prismaService, 1);

      expect(result).toBe(1);
      expect(prismaService.context_manager.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          active: true,
          context: {
            active: true,
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });
    });

    it('deve retornar primeiro contexto criado', async () => {
      const mockContextManager = {
        context_id: 2,
        user_id: 1,
        active: true,
        created_at: new Date('2024-01-01'),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContext(prismaService, 1);

      expect(result).toBe(2);
      expect(prismaService.context_manager.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            created_at: 'asc',
          },
        }),
      );
    });

    it('deve lançar ForbiddenException quando não existe', async () => {
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);

      await expect(getUserContext(prismaService, 1)).rejects.toThrow(ForbiddenException);
      await expect(getUserContext(prismaService, 1)).rejects.toThrow(
        'Usuário não possui contexto associado ou contexto está inativo',
      );
    });

    it('deve filtrar apenas managers e contextos ativos', async () => {
      const mockContextManager = {
        context_id: 1,
        user_id: 1,
        active: true,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      await getUserContext(prismaService, 1);

      expect(prismaService.context_manager.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          active: true,
          context: {
            active: true,
          },
        },
        orderBy: {
          created_at: 'asc',
        },
      });
    });
  });
});


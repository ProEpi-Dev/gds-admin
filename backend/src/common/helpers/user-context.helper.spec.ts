import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getUserContextId,
  getUserContextAsManager,
  getUserParticipationId,
  getUserContext,
} from './user-context.helper';

describe('UserContextHelper', () => {
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      context_manager: {
        findFirst: jest.fn(),
      },
      participation: {
        findFirst: jest.fn(),
      },
    } as any;
  });

  describe('getUserContextId', () => {
    it('deve retornar context_id quando usuário é manager', async () => {
      const mockContextManager = {
        context_id: 1,
        user_id: 1,
        active: true,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContextId(prismaService, 1);

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

    it('deve retornar context_id quando usuário é participante (não é manager)', async () => {
      const mockParticipation = {
        id: 1,
        context_id: 2,
        user_id: 1,
        active: true,
        start_date: new Date('2024-01-01'),
        end_date: null,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(mockParticipation as any);

      const result = await getUserContextId(prismaService, 1);

      expect(result).toBe(2);
      expect(prismaService.context_manager.findFirst).toHaveBeenCalled();
      expect(prismaService.participation.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          active: true,
          context: {
            active: true,
          },
          start_date: {
            lte: expect.any(Date),
          },
          OR: [
            { end_date: null },
            { end_date: { gte: expect.any(Date) } },
          ],
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('deve priorizar manager quando usuário tem ambos os papéis', async () => {
      const mockContextManager = {
        context_id: 1,
        user_id: 1,
        active: true,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContextId(prismaService, 1);

      expect(result).toBe(1);
      expect(prismaService.context_manager.findFirst).toHaveBeenCalled();
      expect(prismaService.participation.findFirst).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException quando não é manager nem participante', async () => {
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(null);

      await expect(getUserContextId(prismaService, 1)).rejects.toThrow(ForbiddenException);
      await expect(getUserContextId(prismaService, 1)).rejects.toThrow(
        'Usuário não possui contexto associado ou contexto está inativo',
      );
    });
  });

  describe('getUserContextAsManager', () => {
    it('deve retornar context_id quando usuário é manager', async () => {
      const mockContextManager = {
        context_id: 1,
        user_id: 1,
        active: true,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContextAsManager(prismaService, 1);

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

    it('deve lançar ForbiddenException quando usuário não é manager', async () => {
      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(null);

      await expect(getUserContextAsManager(prismaService, 1)).rejects.toThrow(ForbiddenException);
      await expect(getUserContextAsManager(prismaService, 1)).rejects.toThrow(
        'Usuário não é gerenciador de nenhum contexto ativo',
      );
    });

    it('deve retornar primeiro contexto criado', async () => {
      const mockContextManager = {
        context_id: 2,
        user_id: 1,
        active: true,
        created_at: new Date('2024-01-01'),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContextAsManager(prismaService, 1);

      expect(result).toBe(2);
      expect(prismaService.context_manager.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            created_at: 'asc',
          },
        }),
      );
    });
  });

  describe('getUserParticipationId', () => {
    it('deve retornar participation_id quando usuário é participante', async () => {
      const mockParticipation = {
        id: 1,
        context_id: 2,
        user_id: 1,
        active: true,
        start_date: new Date('2024-01-01'),
        end_date: null,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(mockParticipation as any);

      const result = await getUserParticipationId(prismaService, 1);

      expect(result).toBe(1);
      expect(prismaService.participation.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          active: true,
          context: {
            active: true,
          },
          start_date: {
            lte: expect.any(Date),
          },
          OR: [
            { end_date: null },
            { end_date: { gte: expect.any(Date) } },
          ],
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('deve retornar participation_id para contexto específico', async () => {
      const mockParticipation = {
        id: 1,
        context_id: 2,
        user_id: 1,
        active: true,
        start_date: new Date('2024-01-01'),
        end_date: null,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(mockParticipation as any);

      const result = await getUserParticipationId(prismaService, 1, 2);

      expect(result).toBe(1);
      expect(prismaService.participation.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 1,
          context_id: 2,
          active: true,
          context: {
            active: true,
          },
          start_date: {
            lte: expect.any(Date),
          },
          OR: [
            { end_date: null },
            { end_date: { gte: expect.any(Date) } },
          ],
        },
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('deve lançar ForbiddenException quando usuário não é participante', async () => {
      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(null);

      await expect(getUserParticipationId(prismaService, 1)).rejects.toThrow(ForbiddenException);
      await expect(getUserParticipationId(prismaService, 1)).rejects.toThrow(
        'Usuário não possui participação ativa',
      );
    });

    it('deve lançar ForbiddenException com mensagem específica para contexto', async () => {
      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(null);

      await expect(getUserParticipationId(prismaService, 1, 2)).rejects.toThrow(ForbiddenException);
      await expect(getUserParticipationId(prismaService, 1, 2)).rejects.toThrow(
        'Usuário não possui participação ativa no contexto 2',
      );
    });

    it('deve retornar participação mais recente', async () => {
      const mockParticipation = {
        id: 3,
        context_id: 2,
        user_id: 1,
        active: true,
        start_date: new Date('2024-06-01'),
        end_date: null,
        created_at: new Date('2024-06-01'),
      };

      jest.spyOn(prismaService.participation, 'findFirst').mockResolvedValue(mockParticipation as any);

      const result = await getUserParticipationId(prismaService, 1);

      expect(result).toBe(3);
      expect(prismaService.participation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            created_at: 'desc',
          },
        }),
      );
    });
  });

  describe('getUserContext (deprecated)', () => {
    it('deve usar getUserContextId internamente', async () => {
      const mockContextManager = {
        context_id: 1,
        user_id: 1,
        active: true,
        created_at: new Date(),
      };

      jest.spyOn(prismaService.context_manager, 'findFirst').mockResolvedValue(mockContextManager as any);

      const result = await getUserContext(prismaService, 1);

      expect(result).toBe(1);
      expect(prismaService.context_manager.findFirst).toHaveBeenCalled();
    });
  });
});

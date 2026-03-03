import { Test, TestingModule } from '@nestjs/testing';
import { TrackService } from './track.service';
import { AuthzService } from '../authz/authz.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('TrackService', () => {
  let service: TrackService;
  let authzMock: {
    isAdmin: jest.Mock;
    hasAnyRole: jest.Mock;
    getManagedContextIds: jest.Mock;
  };

  const prismaMock = {
    participation: {
      findMany: jest.fn(),
    },
    participation_role: {
      findFirst: jest.fn(),
    },
    context: {
      findUnique: jest.fn(),
    },
    track: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    section: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    sequence: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    track_progress: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    sequence_progress: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const mockUser = { id: 1, userId: 1 };

  const mockManagedContexts = [
    {
      context_id: 1,
      context: { id: 1, name: 'Test Context', active: true },
    },
  ];

  const mockTrack = {
    id: 1,
    name: 'Track Teste',
    active: true,
    context_id: 1,
    section: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackService,
        {
          provide: AuthzService,
          useValue: (authzMock = {
            isAdmin: jest.fn().mockResolvedValue(false),
            hasAnyRole: jest.fn().mockResolvedValue(true),
            getManagedContextIds: jest.fn().mockResolvedValue([1]),
          }),
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TrackService>(TrackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /* ---------------- CREATE ---------------- */

  describe('create', () => {
    it('deve criar uma track', async () => {
      prismaMock.participation.findMany.mockResolvedValue(
        mockManagedContexts,
      );
      prismaMock.track.create.mockResolvedValue(mockTrack);

      const result = await service.create({ name: 'Track Teste' }, mockUser);

      expect(result).toEqual(mockTrack);
      expect(prismaMock.track.create).toHaveBeenCalled();
    });

    it('deve lidar com datas vazias', async () => {
      prismaMock.participation.findMany.mockResolvedValue(
        mockManagedContexts,
      );
      prismaMock.track.create.mockResolvedValue(mockTrack);

      await service.create(
        {
          name: 'Track Teste',
          start_date: '',
          end_date: '',
        },
        mockUser,
      );

      expect(prismaMock.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            start_date: undefined,
            end_date: undefined,
          }),
        }),
      );
    });

    it('deve lançar BadRequestException quando context_id não for informado e usuário não gerencia nenhum contexto', async () => {
      prismaMock.participation.findMany.mockResolvedValue([]);

      await expect(
        service.create({ name: 'Track Teste' }, { userId: mockUser.id }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.track.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando admin não informa context_id', async () => {
      authzMock.isAdmin.mockResolvedValue(true);

      await expect(
        service.create({ name: 'Track Teste' }, { userId: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.track.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando admin informa context_id inativo/inexistente', async () => {
      authzMock.isAdmin.mockResolvedValue(true);
      prismaMock.context.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Track Teste', context_id: 999 }, { userId: 1 }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.track.create).not.toHaveBeenCalled();
    });

    it('deve aceitar context_id quando admin e contexto existe', async () => {
      authzMock.isAdmin.mockResolvedValue(true);
      prismaMock.context.findUnique.mockResolvedValue({
        id: 5,
        name: 'Ctx',
        active: true,
      });
      prismaMock.track.create.mockResolvedValue({
        ...mockTrack,
        context_id: 5,
      });

      const result = await service.create(
        { name: 'Track Teste', context_id: 5 },
        { userId: 1 },
      );

      expect(result.context_id).toBe(5);
      expect(prismaMock.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ context_id: 5 }),
        }),
      );
    });

    it('deve lançar BadRequest quando não-admin informa context_id que não gerencia', async () => {
      prismaMock.participation_role.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { name: 'Track Teste', context_id: 99 },
          { userId: 1 },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.track.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando gerencia múltiplos contextos e não informa context_id', async () => {
      prismaMock.participation.findMany.mockResolvedValue([
        { context_id: 1, context: { id: 1, name: 'C1', active: true } },
        { context_id: 2, context: { id: 2, name: 'C2', active: true } },
      ]);

      await expect(
        service.create({ name: 'Track Teste' }, { userId: 1 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({ name: 'Track Teste' }, { userId: 1 }),
      ).rejects.toThrow(/múltiplos contextos/);
      expect(prismaMock.track.create).not.toHaveBeenCalled();
    });
  });

  /* ---------------- LIST ---------------- */

  describe('list', () => {
    it('deve retornar tracks ativas', async () => {
      prismaMock.participation.findMany.mockResolvedValue(mockManagedContexts);
      prismaMock.track.findMany.mockResolvedValue([mockTrack]);

      const result = await service.list({}, 1);

      expect(result).toEqual([mockTrack]);
      expect(prismaMock.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('deve filtrar por contextId quando admin', async () => {
      authzMock.isAdmin.mockResolvedValue(true);
      prismaMock.track.findMany.mockResolvedValue([mockTrack]);

      await service.list({ contextId: 2 }, 1);

      expect(prismaMock.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true, context_id: 2 },
        }),
      );
    });

    it('deve lançar Forbidden quando não-admin lista com contextId que não gerencia', async () => {
      prismaMock.participation_role.findFirst.mockResolvedValue(null);

      await expect(service.list({ contextId: 99 }, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve retornar array vazio quando não-admin sem contextId e não gerencia nenhum', async () => {
      prismaMock.participation.findMany.mockResolvedValue([]);

      const result = await service.list({}, 1);

      expect(result).toEqual([]);
      expect(prismaMock.track.findMany).not.toHaveBeenCalled();
    });
  });

  /* ---------------- GET ---------------- */

  describe('get', () => {
    it('deve retornar uma track por id', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});

      const result = await service.get(1, 1);

      expect(result).toEqual(mockTrack);
    });

    it('deve lançar NotFoundException se não existir', async () => {
      prismaMock.track.findUnique.mockResolvedValue(null);

      await expect(service.get(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('deve lançar Forbidden quando não-admin acessa trilha de contexto que não gerencia', async () => {
      prismaMock.track.findUnique.mockResolvedValue({
        ...mockTrack,
        context_id: 99,
      });
      prismaMock.participation_role.findFirst.mockResolvedValue(null);

      await expect(service.get(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  /* ---------------- DELETE ---------------- */

  describe('delete', () => {
    it('deve desativar a track', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.track.update.mockResolvedValue({
        ...mockTrack,
        active: false,
      });

      const result = await service.delete(1, 1);

      expect(result.active).toBe(false);
      expect(prismaMock.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });
  });

  /* ---------------- UPDATE ---------------- */

  describe('update', () => {
    it('deve atualizar uma track', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.track.update.mockResolvedValue(mockTrack);

      const result = await service.update(
        1,
        { name: 'Track Atualizada' },
        mockUser,
      );

      expect(result).toEqual(mockTrack);
    });

    it('deve lidar com datas vazias no update', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.track.update.mockResolvedValue(mockTrack);

      await service.update(
        1,
        {
          name: 'Track Atualizada',
          start_date: '',
          end_date: '',
        },
        mockUser,
      );

      expect(prismaMock.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Track Atualizada',
          start_date: undefined,
          end_date: undefined,
        },
      });
    });

    it('deve preservar IDs de seções/sequências e não recriar tudo ao atualizar', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.track.update.mockResolvedValue(mockTrack);

      prismaMock.section.findMany.mockResolvedValue([
        {
          id: 10,
          track_id: 1,
          name: 'Seção 1',
          order: 0,
          active: true,
          sequence: [
            {
              id: 100,
              section_id: 10,
              content_id: 1,
              form_id: null,
              order: 0,
              active: true,
            },
          ],
        },
      ]);
      prismaMock.sequence.findMany.mockResolvedValue([{ id: 100 }]);
      prismaMock.track_progress.findMany.mockResolvedValue([]);

      await service.update(
        1,
        {
          name: 'Track Atualizada',
          sections: [
            {
              id: 10,
              name: 'Seção 1',
              order: 0,
              sequences: [
                {
                  id: 100,
                  order: 0,
                  content_id: 1,
                  form_id: null,
                },
              ],
            },
          ],
        },
        mockUser,
      );

      expect(prismaMock.sequence.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.section.deleteMany).not.toHaveBeenCalled();
      expect(prismaMock.section.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          name: 'Seção 1',
          order: 0,
          active: true,
        },
      });
      expect(prismaMock.sequence.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: {
          section_id: 10,
          order: 0,
          content_id: 1,
          form_id: null,
          active: true,
        },
      });
    });

    it('deve atualizar context_id quando informado e diferente do atual', async () => {
      prismaMock.track.findUnique.mockResolvedValue({
        ...mockTrack,
        context_id: 1,
      });
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.context.findUnique.mockResolvedValue({
        id: 2,
        name: 'Outro',
        active: true,
      });
      authzMock.isAdmin.mockResolvedValue(true);
      prismaMock.track.update.mockResolvedValue({
        ...mockTrack,
        context_id: 2,
      });

      await service.update(1, { name: 'Track', context_id: 2 }, mockUser);

      expect(prismaMock.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ context_id: 2 }),
      });
    });

    it('deve criar nova seção e sequência quando section sem id no update', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.track.update.mockResolvedValue(mockTrack);
      prismaMock.section.findMany.mockResolvedValue([]);
      prismaMock.track_progress.findMany.mockResolvedValue([]);
      prismaMock.section.create.mockResolvedValue({
        id: 20,
        track_id: 1,
        name: 'Nova Seção',
        order: 0,
        active: true,
      });
      prismaMock.sequence.create.mockResolvedValue({
        id: 200,
        section_id: 20,
        order: 0,
        content_id: null,
        form_id: null,
        active: true,
      });

      await service.update(
        1,
        {
          name: 'Track',
          sections: [
            {
              name: 'Nova Seção',
              order: 0,
              sequences: [{ order: 0, content_id: null, form_id: null }],
            },
          ],
        },
        mockUser,
      );

      expect(prismaMock.section.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          track_id: 1,
          name: 'Nova Seção',
          order: 0,
          active: true,
        }),
      });
      expect(prismaMock.sequence.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          section_id: 20,
          order: 0,
          content_id: null,
          form_id: null,
          active: true,
        }),
      });
    });
  });

  /* ---------------- REMOVE SEQUENCE ---------------- */

  describe('removeSequence', () => {
    it('deve remover e reordenar sequences', async () => {
      prismaMock.sequence.findUnique.mockResolvedValue({
        id: 1,
        section_id: 1,
        order: 0,
      });

      prismaMock.sequence.findMany.mockResolvedValue([
        { id: 2, section_id: 1, order: 1 },
      ]);

      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.sequence.update.mockResolvedValue({});
      prismaMock.sequence.delete.mockResolvedValue({});

      await service.removeSequence(1, 1, 1, 1);

      expect(prismaMock.sequence.delete).toHaveBeenCalled();
      expect(prismaMock.sequence.update).toHaveBeenCalled();
    });

    it('deve lançar erro se sequence não existir', async () => {
      prismaMock.sequence.findUnique.mockResolvedValue(null);

      await expect(service.removeSequence(1, 1, 999, 1)).rejects.toThrow(
        'Sequence not found',
      );
    });
  });

  /* ---------------- REORDER ---------------- */

  describe('reorderSections', () => {
    it('deve reordenar seções', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.section.update.mockResolvedValue({});

      await service.reorderSections(1, [
        { id: 1, order: 1 },
        { id: 2, order: 0 },
      ], 1);

      expect(prismaMock.section.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('reorderSequences', () => {
    it('deve reordenar sequences', async () => {
      prismaMock.track.findUnique.mockResolvedValue(mockTrack);
      prismaMock.participation_role.findFirst.mockResolvedValue({});
      prismaMock.sequence.update.mockResolvedValue({});

      await service.reorderSequences(1, 1, [
        { id: 1, order: 1 },
        { id: 2, order: 0 },
      ], 1);

      expect(prismaMock.sequence.update).toHaveBeenCalledTimes(2);
    });
  });
});

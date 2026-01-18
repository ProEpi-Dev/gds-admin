import { Test, TestingModule } from '@nestjs/testing';
import { TrackService } from './track.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrackService', () => {
  let service: TrackService;
  let prismaService: PrismaService;

  const mockTrack = {
    id: 1,
    name: 'Track Teste',
    active: true,
    section: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackService,
        {
          provide: PrismaService,
          useValue: {
            track: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            section: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            sequence: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TrackService>(TrackService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar uma track', async () => {
      jest
        .spyOn(prismaService.track, 'create')
        .mockResolvedValue(mockTrack as any);

      const result = await service.create({
        name: 'Track Teste',
      });

      expect(result).toEqual(mockTrack);
      expect(prismaService.track.create).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('deve retornar lista de tracks ativas', async () => {
      jest
        .spyOn(prismaService.track, 'findMany')
        .mockResolvedValue([mockTrack] as any);

      const result = await service.list();

      expect(result).toEqual([mockTrack]);
      expect(prismaService.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });
  });

  describe('get', () => {
    it('deve retornar uma track por id', async () => {
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      const result = await service.get(1);

      expect(result).toEqual(mockTrack);
      expect(prismaService.track.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        }),
      );
    });

    it('deve retornar null se não existir', async () => {
      jest.spyOn(prismaService.track, 'findUnique').mockResolvedValue(null);

      const result = await service.get(999);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deve desativar a track', async () => {
      jest.spyOn(prismaService.track, 'update').mockResolvedValue({
        ...mockTrack,
        active: false,
      } as any);

      const result = await service.delete(1);

      expect(result.active).toBe(false);
      expect(prismaService.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });
  });

  describe('create with sections and sequences', () => {
    it('deve criar uma track com sections e sequences', async () => {
      const trackWithSections = {
        ...mockTrack,
        section: [
          {
            id: 1,
            name: 'Seção 1',
            order: 0,
            sequence: [
              { id: 1, order: 0, content_id: 1, form_id: null },
            ],
          },
        ],
      };

      jest
        .spyOn(prismaService.track, 'create')
        .mockResolvedValue(trackWithSections as any);

      const result = await service.create({
        name: 'Track Teste',
        sections: [
          {
            name: 'Seção 1',
            sequences: [{ content_id: 1 }],
          },
        ],
      });

      expect(result).toEqual(trackWithSections);
      expect(prismaService.track.create).toHaveBeenCalled();
    });

    it('deve lidar com datas vazias', async () => {
      jest
        .spyOn(prismaService.track, 'create')
        .mockResolvedValue(mockTrack as any);

      await service.create({
        name: 'Track Teste',
        start_date: '',
        end_date: '',
      });

      expect(prismaService.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Track Teste',
            start_date: undefined,
            end_date: undefined,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('deve atualizar uma track', async () => {
      jest
        .spyOn(prismaService.track, 'update')
        .mockResolvedValue(mockTrack as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      const result = await service.update(1, {
        name: 'Track Atualizada',
      });

      expect(result).toEqual(mockTrack);
      expect(prismaService.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Track Atualizada' },
      });
    });

    it('deve atualizar track com sections', async () => {
      jest
        .spyOn(prismaService.track, 'update')
        .mockResolvedValue(mockTrack as any);
      jest
        .spyOn(prismaService.sequence, 'deleteMany')
        .mockResolvedValue({ count: 0 } as any);
      jest
        .spyOn(prismaService.section, 'deleteMany')
        .mockResolvedValue({ count: 0 } as any);
      jest
        .spyOn(prismaService.section, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.update(1, {
        name: 'Track Atualizada',
        sections: [
          {
            name: 'Seção 1',
            sequences: [{ content_id: 1 }],
          },
        ],
      });

      expect(prismaService.sequence.deleteMany).toHaveBeenCalled();
      expect(prismaService.section.deleteMany).toHaveBeenCalled();
      expect(prismaService.section.create).toHaveBeenCalled();
    });

    it('deve lidar com datas vazias no update', async () => {
      jest
        .spyOn(prismaService.track, 'update')
        .mockResolvedValue(mockTrack as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.update(1, {
        name: 'Track Atualizada',
        start_date: '',
        end_date: '',
      });

      expect(prismaService.track.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'Track Atualizada',
          start_date: undefined,
          end_date: undefined,
        },
      });
    });
  });

  describe('removeSequence', () => {
    it('deve remover uma sequence e reordenar as restantes', async () => {
      const mockSequence = {
        id: 1,
        section_id: 1,
        order: 0,
      };

      jest
        .spyOn(prismaService.sequence, 'findUnique')
        .mockResolvedValue(mockSequence as any);
      jest
        .spyOn(prismaService.sequence, 'delete')
        .mockResolvedValue(mockSequence as any);
      jest.spyOn(prismaService.sequence, 'findMany').mockResolvedValue([
        { id: 2, section_id: 1, order: 1 },
      ] as any);
      jest
        .spyOn(prismaService.sequence, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.removeSequence(1, 1, 1);

      expect(prismaService.sequence.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.sequence.update).toHaveBeenCalled();
    });

    it('deve lançar erro se sequence não pertence à seção', async () => {
      jest.spyOn(prismaService.sequence, 'findUnique').mockResolvedValue({
        id: 1,
        section_id: 999, // ID diferente
        order: 0,
      } as any);

      await expect(service.removeSequence(1, 1, 1)).rejects.toThrow(
        'Sequence not found',
      );
    });

    it('deve lançar erro se sequence não existe', async () => {
      jest.spyOn(prismaService.sequence, 'findUnique').mockResolvedValue(null);

      await expect(service.removeSequence(1, 1, 999)).rejects.toThrow(
        'Sequence not found',
      );
    });
  });

  describe('addContentToSection', () => {
    it('deve adicionar conteúdo a uma seção', async () => {
      const mockSection = {
        id: 1,
        name: 'Seção 1',
        sequence: [{ id: 1, order: 0 }],
      };

      jest
        .spyOn(prismaService.section, 'findUnique')
        .mockResolvedValue(mockSection as any);
      jest
        .spyOn(prismaService.sequence, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.addContentToSection(1, 1, 1);

      expect(prismaService.sequence.create).toHaveBeenCalledWith({
        data: {
          section_id: 1,
          content_id: 1,
          order: 1,
        },
      });
    });

    it('deve adicionar conteúdo a uma seção vazia', async () => {
      const mockSection = {
        id: 1,
        name: 'Seção 1',
        sequence: [],
      };

      jest
        .spyOn(prismaService.section, 'findUnique')
        .mockResolvedValue(mockSection as any);
      jest
        .spyOn(prismaService.sequence, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.addContentToSection(1, 1, 1);

      expect(prismaService.sequence.create).toHaveBeenCalledWith({
        data: {
          section_id: 1,
          content_id: 1,
          order: 0,
        },
      });
    });

    it('deve lançar erro se seção não existe', async () => {
      jest.spyOn(prismaService.section, 'findUnique').mockResolvedValue(null);

      await expect(service.addContentToSection(1, 999, 1)).rejects.toThrow(
        'Section not found',
      );
    });
  });

  describe('addFormToSection', () => {
    it('deve adicionar formulário a uma seção', async () => {
      const mockSection = {
        id: 1,
        name: 'Seção 1',
        sequence: [{ id: 1, order: 0 }],
      };

      jest
        .spyOn(prismaService.section, 'findUnique')
        .mockResolvedValue(mockSection as any);
      jest
        .spyOn(prismaService.sequence, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.addFormToSection(1, 1, 1);

      expect(prismaService.sequence.create).toHaveBeenCalledWith({
        data: {
          section_id: 1,
          form_id: 1,
          order: 1,
        },
      });
    });

    it('deve adicionar formulário a uma seção vazia', async () => {
      const mockSection = {
        id: 1,
        name: 'Seção 1',
        sequence: [],
      };

      jest
        .spyOn(prismaService.section, 'findUnique')
        .mockResolvedValue(mockSection as any);
      jest
        .spyOn(prismaService.sequence, 'create')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.addFormToSection(1, 1, 1);

      expect(prismaService.sequence.create).toHaveBeenCalledWith({
        data: {
          section_id: 1,
          form_id: 1,
          order: 0,
        },
      });
    });

    it('deve lançar erro se seção não existe', async () => {
      jest.spyOn(prismaService.section, 'findUnique').mockResolvedValue(null);

      await expect(service.addFormToSection(1, 999, 1)).rejects.toThrow(
        'Section not found',
      );
    });
  });

  describe('removeContentFromSection', () => {
    it('deve remover conteúdo de uma seção e reordenar', async () => {
      const mockSequence = {
        id: 1,
        section_id: 1,
        content_id: 1,
        order: 0,
      };

      jest
        .spyOn(prismaService.sequence, 'findFirst')
        .mockResolvedValue(mockSequence as any);
      jest
        .spyOn(prismaService.sequence, 'delete')
        .mockResolvedValue(mockSequence as any);
      jest.spyOn(prismaService.sequence, 'findMany').mockResolvedValue([
        { id: 2, order: 1 },
      ] as any);
      jest
        .spyOn(prismaService.sequence, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.removeContentFromSection(1, 1, 1);

      expect(prismaService.sequence.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.sequence.update).toHaveBeenCalled();
    });

    it('deve lançar erro se sequence não existe', async () => {
      jest.spyOn(prismaService.sequence, 'findFirst').mockResolvedValue(null);

      await expect(service.removeContentFromSection(1, 1, 999)).rejects.toThrow(
        'Sequence not found',
      );
    });
  });

  describe('reorderSections', () => {
    it('deve reordenar seções', async () => {
      jest
        .spyOn(prismaService.section, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.reorderSections(1, [
        { id: 1, order: 1 },
        { id: 2, order: 0 },
      ]);

      expect(prismaService.section.update).toHaveBeenCalledTimes(2);
      expect(prismaService.section.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { order: 1 },
      });
      expect(prismaService.section.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { order: 0 },
      });
    });
  });

  describe('reorderSequences', () => {
    it('deve reordenar sequences', async () => {
      jest
        .spyOn(prismaService.sequence, 'update')
        .mockResolvedValue({} as any);
      jest
        .spyOn(prismaService.track, 'findUnique')
        .mockResolvedValue(mockTrack as any);

      await service.reorderSequences(1, 1, [
        { id: 1, order: 1 },
        { id: 2, order: 0 },
      ]);

      expect(prismaService.sequence.update).toHaveBeenCalledTimes(2);
      expect(prismaService.sequence.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { order: 1 },
      });
      expect(prismaService.sequence.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { order: 0 },
      });
    });
  });
});

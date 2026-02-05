import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: PrismaService;

  const mockContent = {
    id: 1,
    title: 'Test Content',
    slug: 'test-content',
    content: '<p>Test HTML content</p>',
    summary: 'Test summary',
    reference: 'ref-123',
    author_id: 1,
    context_id: 1,
    active: true,
    published_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    content_tag: [],
  };

  const mockTag = {
    id: 1,
    name: 'Test Tag',
    color: '#FF0000',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: {
            content: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            tag: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar conteúdo sem tags', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
      };

      jest
        .spyOn(prismaService.content, 'create')
        .mockResolvedValue(mockContent as any);

      const result = await service.create(createData);

      expect(result).toEqual(mockContent);
      expect(prismaService.content.create).toHaveBeenCalledWith({
        data: {
          ...createData,
          active: true,
          published_at: expect.any(Date),
        },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    it('deve criar conteúdo com tags', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
        tags: [1, 2],
      };

      jest
        .spyOn(prismaService.tag, 'findMany')
        .mockResolvedValue([mockTag] as any);
      jest
        .spyOn(prismaService.content, 'create')
        .mockResolvedValue(mockContent as any);

      const result = await service.create(createData);

      expect(prismaService.tag.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
      expect(result).toEqual(mockContent);
    });

    it('deve definir active como true por padrão', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
      };

      jest
        .spyOn(prismaService.content, 'create')
        .mockResolvedValue(mockContent as any);

      await service.create(createData);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('deve definir published_at quando active é true', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
        active: true,
      };

      jest
        .spyOn(prismaService.content, 'create')
        .mockResolvedValue(mockContent as any);

      await service.create(createData);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            published_at: expect.any(Date),
          }),
        }),
      );
    });

    it('deve definir published_at como null quando active é false', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
        active: false,
      };

      jest
        .spyOn(prismaService.content, 'create')
        .mockResolvedValue(mockContent as any);

      await service.create(createData);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            published_at: null,
          }),
        }),
      );
    });
  });

  describe('list', () => {
    it('deve retornar lista de conteúdos ativos', async () => {
      const mockContents = [mockContent];
      jest
        .spyOn(prismaService.content, 'findMany')
        .mockResolvedValue(mockContents as any);

      const result = await service.list();

      expect(result).toEqual(mockContents);
      expect(prismaService.content.findMany).toHaveBeenCalledWith({
        where: { active: true },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      });
    });

    it('deve retornar array vazio quando não há conteúdos', async () => {
      jest.spyOn(prismaService.content, 'findMany').mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    it('deve retornar conteúdo por id', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);

      const result = await service.get(1);

      expect(result).toEqual(mockContent);
      expect(prismaService.content.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    it('deve retornar null quando conteúdo não existe', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue(null);

      const result = await service.get(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar conteúdo sem tags', async () => {
      const updateData = {
        title: 'Updated Content',
        content: '<p>Updated content</p>',
      };

      jest
        .spyOn(prismaService.content, 'update')
        .mockResolvedValue(mockContent as any);

      const result = await service.update(1, updateData);

      expect(result).toEqual(mockContent);
      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateData,
          updated_at: expect.any(Date),
        },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    it('deve atualizar conteúdo com tags', async () => {
      const updateData = {
        title: 'Updated Content',
        tags: [1, 2],
      };

      jest
        .spyOn(prismaService.tag, 'findMany')
        .mockResolvedValue([mockTag] as any);
      jest
        .spyOn(prismaService.content, 'update')
        .mockResolvedValue(mockContent as any);

      const result = await service.update(1, updateData);

      expect(prismaService.tag.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
      expect(prismaService.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            content_tag: {
              deleteMany: {},
              create: expect.any(Array),
            },
          }),
        }),
      );
      expect(result).toEqual(mockContent);
    });

    it('deve atualizar updated_at', async () => {
      const updateData = {
        title: 'Updated Content',
      };

      jest
        .spyOn(prismaService.content, 'update')
        .mockResolvedValue(mockContent as any);

      await service.update(1, updateData);

      expect(prismaService.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            updated_at: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('deve desativar conteúdo (soft delete)', async () => {
      jest.spyOn(prismaService.content, 'update').mockResolvedValue({
        ...mockContent,
        active: false,
      } as any);

      const result = await service.delete(1);

      expect(result).toHaveProperty('active', false);
      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthzService } from '../authz/authz.service';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: PrismaService;
  let authzService: AuthzService;

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
    thumbnail: null,
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
              delete: jest.fn(),
            },
            tag: {
              findMany: jest.fn(),
            },
            sequence: {
              count: jest.fn(),
            },
            content_quiz: {
              count: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuthzService,
          useValue: {
            resolveListContextId: jest.fn().mockResolvedValue(1),
            hasPermission: jest.fn().mockResolvedValue(false),
            isAdmin: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
    authzService = module.get<AuthzService>(AuthzService);
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
          content_type: true,
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

    it('deve lançar BadRequestException CONTENT_THUMBNAIL_TOO_LARGE quando operação falha com erro de thumbnail (code 54000)', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
        tags: [1],
      };
      jest.spyOn(prismaService.tag, 'findMany').mockRejectedValue(
        new Error('index row requires "code: "54000""'),
      );

      await expect(service.create(createData)).rejects.toMatchObject({
        name: 'BadRequestException',
        response: {
          code: 'CONTENT_THUMBNAIL_TOO_LARGE',
          message: expect.stringContaining('thumbnail'),
        },
      });
    });

    it('deve lançar InternalServerErrorException quando operação falha com erro genérico', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
        tags: [1],
      };
      jest
        .spyOn(prismaService.tag, 'findMany')
        .mockRejectedValue(new Error('Unknown DB error'));

      await expect(service.create(createData)).rejects.toMatchObject({
        name: 'InternalServerErrorException',
        response: {
          code: 'CONTENT_PERSISTENCE_ERROR',
          message: 'Erro ao salvar conteúdo.',
        },
      });
    });
  });

  describe('list', () => {
    it('deve retornar lista de conteúdos ativos', async () => {
      const mockContents = [mockContent];
      jest
        .spyOn(prismaService.content, 'findMany')
        .mockResolvedValue(mockContents as any);

      const result = await service.list(1, 1);

      expect(result).toEqual(mockContents);
      expect(prismaService.content.findMany).toHaveBeenCalledWith({
        where: { active: true, context_id: 1 },
        include: {
          content_tag: {
            include: {
              tag: true,
            },
          },
          content_type: true,
          sequence: {
            include: {
              section: {
                include: {
                  track: {
                    select: {
                      id: true,
                      name: true,
                      active: true,
                    },
                  },
                },
              },
            },
          },
          content_quiz: {
            where: { active: true },
            orderBy: { display_order: 'asc' },
            include: {
              form: {
                select: {
                  id: true,
                  title: true,
                  active: true,
                },
              },
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      });
    });

    it('deve retornar array vazio quando não há conteúdos', async () => {
      jest.spyOn(prismaService.content, 'findMany').mockResolvedValue([]);

      const result = await service.list(1, 1);

      expect(result).toEqual([]);
    });

    it('deve listar ativos e inativos quando includeInactive e usuário tem content:write', async () => {
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(prismaService.content, 'findMany').mockResolvedValue([]);

      await service.list(1, 1, { includeInactive: true });

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { context_id: 1 },
        }),
      );
      const call = (prismaService.content.findMany as jest.Mock).mock
        .calls[0][0];
      expect(call.where).not.toHaveProperty('active');
    });

    it('deve manter só ativos quando includeInactive mas sem content:write', async () => {
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(false);
      jest.spyOn(prismaService.content, 'findMany').mockResolvedValue([]);

      await service.list(1, 1, { includeInactive: true });

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true, context_id: 1 },
        }),
      );
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
          content_type: true,
          sequence: {
            include: {
              section: {
                include: {
                  track: {
                    select: {
                      id: true,
                      name: true,
                      active: true,
                    },
                  },
                },
              },
            },
          },
          content_quiz: {
            where: { active: true },
            orderBy: { display_order: 'asc' },
            include: {
              form: {
                select: {
                  id: true,
                  title: true,
                  active: true,
                },
              },
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
          content_type: true,
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

    it('deve lançar InternalServerErrorException quando update com tags falha', async () => {
      jest
        .spyOn(prismaService.tag, 'findMany')
        .mockRejectedValue(new Error('DB error'));

      await expect(
        service.update(1, { title: 'T', tags: [1] }),
      ).rejects.toThrow(InternalServerErrorException);
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
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(0);
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

    it('deve lançar BadRequestException ao desativar com trilha vinculada', async () => {
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(0);

      await expect(service.delete(1)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringMatching(/desativar/i),
        }),
      });
    });

    it('deve lançar BadRequestException ao desativar com quiz vinculado', async () => {
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(1);

      await expect(service.delete(1)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringMatching(/quiz/i),
        }),
      });
    });
  });

  describe('reactivate', () => {
    it('deve reativar conteúdo inativo', async () => {
      const inactive = { ...mockContent, active: false, published_at: null };
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(inactive as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(prismaService.content, 'update').mockResolvedValue({
        ...mockContent,
        active: true,
      } as any);

      const result = await service.reactivate(1, 1);

      expect(result).toMatchObject({ active: true });
      expect(prismaService.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            active: true,
            published_at: expect.any(Date),
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando não existe', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue(null);

      await expect(service.reactivate(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException quando já está ativo', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);

      await expect(service.reactivate(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar ForbiddenException sem permissão no contexto', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue({
        ...mockContent,
        active: false,
      } as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(false);

      await expect(service.reactivate(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('permanentDelete', () => {
    it('deve excluir permanentemente conteúdo inativo', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue({
        ...mockContent,
        active: false,
      } as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(0);
      jest
        .spyOn(prismaService.content, 'delete')
        .mockResolvedValue(mockContent as any);

      await service.permanentDelete(1, 1);

      expect(prismaService.content.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('deve lançar BadRequestException quando há trilha (sequence) vinculada', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue({
        ...mockContent,
        active: false,
      } as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(1);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(0);

      await expect(service.permanentDelete(1, 1)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringMatching(/trilhas/i),
        }),
      });
    });

    it('deve lançar BadRequestException quando há quiz vinculado', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue({
        ...mockContent,
        active: false,
      } as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(2);

      await expect(service.permanentDelete(1, 1)).rejects.toMatchObject({
        response: expect.objectContaining({
          message: expect.stringMatching(/quiz/i),
        }),
      });
    });

    it('deve lançar BadRequestException quando ainda está ativo', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);

      await expect(service.permanentDelete(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException em erro de FK (P2003)', async () => {
      jest.spyOn(prismaService.content, 'findUnique').mockResolvedValue({
        ...mockContent,
        active: false,
      } as any);
      jest.spyOn(authzService, 'hasPermission').mockResolvedValue(true);
      jest.spyOn(prismaService.sequence, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.content_quiz, 'count').mockResolvedValue(0);
      jest
        .spyOn(prismaService.content, 'delete')
        .mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('FK', {
            code: 'P2003',
            clientVersion: 'test',
          }),
        );

      await expect(service.permanentDelete(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('thumbnail validation', () => {
    const createDataWithThumbnail = {
      title: 'Content with Thumbnail',
      slug: 'content-thumbnail',
      content: '<p>Content</p>',
      summary: 'Summary',
      reference: 'ref-789',
      author_id: 1,
      context_id: 1,
      thumbnail: 'data:image/png;base64,iVBORw0KGgo...',
    };

    it('deve criar conteúdo com thumbnail', async () => {
      const contentWithThumbnail = {
        ...mockContent,
        ...createDataWithThumbnail,
      };
      jest
        .spyOn(prismaService.content, 'create')
        .mockResolvedValue(contentWithThumbnail as any);

      const result = await service.create(createDataWithThumbnail);

      expect(result).toEqual(contentWithThumbnail);
      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnail: 'data:image/png;base64,iVBORw0KGgo...',
          }),
        }),
      );
    });

    it('deve atualizar conteúdo com thumbnail', async () => {
      const updateData = {
        thumbnail: 'data:image/jpeg;base64,new...',
      };
      const updatedContent = { ...mockContent, ...updateData };

      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.content, 'update')
        .mockResolvedValue(updatedContent as any);

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedContent);
      expect(prismaService.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnail: 'data:image/jpeg;base64,new...',
          }),
        }),
      );
    });

    it('deve permitir thumbnail nulo', async () => {
      const updateData = {
        thumbnail: null,
      };
      const updatedContent = { ...mockContent, thumbnail: null } as any;

      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.content, 'update')
        .mockResolvedValue(updatedContent as any);

      const result = await service.update(1, updateData);

      expect((result as any).thumbnail).toBeNull();
    });
  });
});

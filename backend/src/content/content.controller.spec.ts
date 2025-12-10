import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

describe('ContentController', () => {
  let controller: ContentController;
  let service: ContentService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: {
            create: jest.fn(),
            list: jest.fn(),
            get: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    service = module.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('deve criar novo conteúdo', async () => {
      const createData = {
        title: 'New Content',
        slug: 'new-content',
        content: '<p>Content</p>',
        summary: 'Summary',
        reference: 'ref-456',
        author_id: 1,
        context_id: 1,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockContent as any);

      const result = await controller.create(createData);

      expect(result).toEqual(mockContent);
      expect(service.create).toHaveBeenCalledWith(createData);
    });
  });

  describe('list', () => {
    it('deve retornar lista de conteúdos', async () => {
      const mockContents = [mockContent];
      jest.spyOn(service, 'list').mockResolvedValue(mockContents as any);

      const result = await controller.list();

      expect(result).toEqual(mockContents);
      expect(service.list).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('deve retornar conteúdo por id', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(mockContent as any);

      const result = await controller.get('1');

      expect(result).toEqual(mockContent);
      expect(service.get).toHaveBeenCalledWith(1);
    });

    it('deve converter string id para número', async () => {
      jest.spyOn(service, 'get').mockResolvedValue(mockContent as any);

      await controller.get('123');

      expect(service.get).toHaveBeenCalledWith(123);
    });
  });

  describe('update', () => {
    it('deve atualizar conteúdo', async () => {
      const updateData = {
        title: 'Updated Content',
        content: '<p>Updated content</p>',
      };

      const updatedContent = { ...mockContent, ...updateData };
      jest.spyOn(service, 'update').mockResolvedValue(updatedContent as any);

      const result = await controller.update('1', updateData);

      expect(result).toEqual(updatedContent);
      expect(service.update).toHaveBeenCalledWith(1, updateData);
    });

    it('deve converter string id para número', async () => {
      const updateData = {
        title: 'Updated Content',
      };

      jest.spyOn(service, 'update').mockResolvedValue(mockContent as any);

      await controller.update('456', updateData);

      expect(service.update).toHaveBeenCalledWith(456, updateData);
    });
  });

  describe('delete', () => {
    it('deve deletar conteúdo', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(mockContent as any);

      const result = await controller.delete('1');

      expect(result).toEqual(mockContent);
      expect(service.delete).toHaveBeenCalledWith(1);
    });

    it('deve converter string id para número', async () => {
      jest.spyOn(service, 'delete').mockResolvedValue(mockContent as any);

      await controller.delete('789');

      expect(service.delete).toHaveBeenCalledWith(789);
    });
  });
});

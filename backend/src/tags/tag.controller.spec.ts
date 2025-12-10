import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto } from './tag.dto';

describe('TagController', () => {
  let controller: TagController;
  let service: TagService;

  const mockTag = {
    id: 1,
    name: 'Test Tag',
    color: '#FF0000',
    description: 'Test description',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [
        {
          provide: TagService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TagController>(TagController);
    service = module.get<TagService>(TagService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar array de tags', async () => {
      const mockTags = [mockTag];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockTags as any);

      const result = await controller.findAll();

      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('deve criar nova tag', async () => {
      const createDto: CreateTagDto = {
        name: 'New Tag',
        color: '#00FF00',
        description: 'New description',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockTag as any);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTag);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findOne', () => {
    it('deve retornar tag por id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTag as any);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockTag);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('deve converter string id para número', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTag as any);

      await controller.findOne('123');

      expect(service.findOne).toHaveBeenCalledWith(123);
    });
  });

  describe('update', () => {
    it('deve atualizar tag', async () => {
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
        color: '#0000FF',
      };

      const updatedTag = { ...mockTag, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updatedTag as any);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updatedTag);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('deve converter string id para número', async () => {
      const updateDto: UpdateTagDto = {
        name: 'Updated Tag',
      };

      jest.spyOn(service, 'update').mockResolvedValue(mockTag as any);

      await controller.update('456', updateDto);

      expect(service.update).toHaveBeenCalledWith(456, updateDto);
    });
  });

  describe('remove', () => {
    it('deve deletar tag', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(mockTag as any);

      const result = await controller.remove('1');

      expect(result).toEqual(mockTag);
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('deve converter string id para número', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(mockTag as any);

      await controller.remove('789');

      expect(service.remove).toHaveBeenCalledWith(789);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ContentTypeController, ContentTypeAdminController } from './content-type.controller';
import { ContentTypeService } from './content-type.service';

describe('ContentTypeController', () => {
  let controller: ContentTypeController;
  let service: ContentTypeService;

  const mockContentType = {
    id: 1,
    name: 'Video',
    description: 'Video content type',
    color: '#FF0000',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentTypeController],
      providers: [
        {
          provide: ContentTypeService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentTypeController>(ContentTypeController);
    service = module.get<ContentTypeService>(ContentTypeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('deve retornar lista de tipos ativos', async () => {
      const mockTypes = [mockContentType];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockTypes as any);

      const result = await controller.findAll();

      expect(result).toEqual(mockTypes);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve retornar tipo por id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockContentType as any);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockContentType);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('deve converter string para número', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockContentType as any);

      await controller.findOne('42');

      expect(service.findOne).toHaveBeenCalledWith(42);
    });
  });
});

describe('ContentTypeAdminController', () => {
  let controller: ContentTypeAdminController;
  let service: ContentTypeService;

  const mockContentType = {
    id: 1,
    name: 'Video',
    description: 'Video content type',
    color: '#FF0000',
    active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentTypeAdminController],
      providers: [
        {
          provide: ContentTypeService,
          useValue: {
            findAllForAdmin: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentTypeAdminController>(ContentTypeAdminController);
    service = module.get<ContentTypeService>(ContentTypeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllAdmin', () => {
    it('deve retornar todos os tipos incluindo inativos', async () => {
      const allTypes = [
        mockContentType,
        { ...mockContentType, id: 2, active: false },
      ];
      jest
        .spyOn(service, 'findAllForAdmin')
        .mockResolvedValue(allTypes as any);

      const result = await controller.findAllAdmin();

      expect(result).toEqual(allTypes);
      expect(service.findAllForAdmin).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('deve criar novo tipo de conteúdo', async () => {
      const createDto = {
        name: 'Video',
        description: 'Video content type',
        color: '#FF0000',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockContentType as any);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockContentType);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('deve atualizar tipo de conteúdo', async () => {
      const updateDto = {
        name: 'Updated Video',
      };

      const updated = { ...mockContentType, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updated as any);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('deve converter string para número', async () => {
      const updateDto = { name: 'Updated' };
      jest
        .spyOn(service, 'update')
        .mockResolvedValue(mockContentType as any);

      await controller.update('42', updateDto);

      expect(service.update).toHaveBeenCalledWith(42, updateDto);
    });
  });

  describe('remove', () => {
    it('deve soft delete tipo de conteúdo', async () => {
      const inactive = { ...mockContentType, active: false };
      jest.spyOn(service, 'softDelete').mockResolvedValue(inactive as any);

      const result = await controller.remove('1');

      expect(result).toEqual(inactive);
      expect(service.softDelete).toHaveBeenCalledWith(1);
    });

    it('deve converter string para número', async () => {
      jest
        .spyOn(service, 'softDelete')
        .mockResolvedValue(mockContentType as any);

      await controller.remove('99');

      expect(service.softDelete).toHaveBeenCalledWith(99);
    });
  });
});

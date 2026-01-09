import { Test, TestingModule } from '@nestjs/testing';
import { ContentQuizController } from './content-quiz.controller';
import { ContentQuizService } from './content-quiz.service';
import { CreateContentQuizDto } from './dto/create-content-quiz.dto';
import { UpdateContentQuizDto } from './dto/update-content-quiz.dto';
import { ContentQuizQueryDto } from './dto/content-quiz-query.dto';

describe('ContentQuizController', () => {
  let controller: ContentQuizController;
  let service: ContentQuizService;

  const mockContentQuiz = {
    id: 1,
    contentId: 1,
    formId: 1,
    displayOrder: 0,
    isRequired: false,
    weight: 1.0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      id: 1,
      title: 'Test Content',
      reference: 'TEST_CONTENT',
    },
    form: {
      id: 1,
      title: 'Test Quiz',
      reference: 'TEST_QUIZ',
      type: 'quiz',
    },
  };

  const mockListResponse = {
    data: [mockContentQuiz],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/content-quiz?page=1',
      last: '/v1/content-quiz?page=1',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentQuizController],
      providers: [
        {
          provide: ContentQuizService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentQuizController>(ContentQuizController);
    service = module.get<ContentQuizService>(ContentQuizService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar associação e retornar 201', async () => {
      const createDto: CreateContentQuizDto = {
        contentId: 1,
        formId: 1,
        displayOrder: 0,
        isRequired: false,
      };

      jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockContentQuiz as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockContentQuiz);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de associações', async () => {
      const query: ContentQuizQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockListResponse as any);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockListResponse);
    });

    it('deve passar filtros para o serviço', async () => {
      const query: ContentQuizQueryDto = {
        page: 1,
        pageSize: 20,
        contentId: 1,
        formId: 1,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockListResponse as any);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar associação por ID', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockContentQuiz as any);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockContentQuiz);
    });
  });

  describe('update', () => {
    it('deve atualizar associação', async () => {
      const updateDto: UpdateContentQuizDto = {
        displayOrder: 1,
        isRequired: true,
      };

      jest
        .spyOn(service, 'update')
        .mockResolvedValue(mockContentQuiz as any);

      const result = await controller.update(1, updateDto);

      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(mockContentQuiz);
    });
  });

  describe('remove', () => {
    it('deve deletar associação e retornar 204', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});

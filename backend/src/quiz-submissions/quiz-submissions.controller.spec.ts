import { Test, TestingModule } from '@nestjs/testing';
import { QuizSubmissionsController } from './quiz-submissions.controller';
import { QuizSubmissionsService } from './quiz-submissions.service';
import { CreateQuizSubmissionDto } from './dto/create-quiz-submission.dto';
import { UpdateQuizSubmissionDto } from './dto/update-quiz-submission.dto';
import { QuizSubmissionQueryDto } from './dto/quiz-submission-query.dto';

describe('QuizSubmissionsController', () => {
  let controller: QuizSubmissionsController;
  let service: QuizSubmissionsService;

  const mockQuizSubmission = {
    id: 1,
    participationId: 1,
    formVersionId: 1,
    quizResponse: { question1: 'a' },
    questionResults: [],
    score: 100,
    percentage: 100,
    isPassed: true,
    attemptNumber: 1,
    timeSpentSeconds: 120,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:02:00Z'),
    active: true,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:02:00Z'),
  };

  const mockListResponse = {
    data: [mockQuizSubmission],
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    },
    links: {
      first: '/v1/quiz-submissions?page=1',
      last: '/v1/quiz-submissions?page=1',
      prev: null,
      next: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizSubmissionsController],
      providers: [
        {
          provide: QuizSubmissionsService,
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

    controller = module.get<QuizSubmissionsController>(
      QuizSubmissionsController,
    );
    service = module.get<QuizSubmissionsService>(QuizSubmissionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar submissão e retornar 201', async () => {
      const createDto: CreateQuizSubmissionDto = {
        participationId: 1,
        formVersionId: 1,
        quizResponse: { question1: 'a' },
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: '2024-01-01T10:02:00Z',
      };

      jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockQuizSubmission);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de submissões', async () => {
      const query: QuizSubmissionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockListResponse as any);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockListResponse);
    });

    it('deve passar filtros para o serviço', async () => {
      const query: QuizSubmissionQueryDto = {
        page: 1,
        pageSize: 20,
        participationId: 1,
        formVersionId: 1,
        isPassed: true,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockListResponse as any);

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('deve retornar submissão por ID', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await controller.findOne(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockQuizSubmission);
    });
  });

  describe('update', () => {
    it('deve atualizar submissão', async () => {
      const updateDto: UpdateQuizSubmissionDto = {
        quizResponse: { question1: 'b' },
      };

      jest
        .spyOn(service, 'update')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await controller.update(1, updateDto);

      expect(service.update).toHaveBeenCalledWith(1, updateDto);
      expect(result).toEqual(mockQuizSubmission);
    });
  });

  describe('remove', () => {
    it('deve deletar submissão e retornar 204', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});

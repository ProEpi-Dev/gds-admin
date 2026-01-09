import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QuizSubmissionsService } from './quiz-submissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizSubmissionDto } from './dto/create-quiz-submission.dto';
import { UpdateQuizSubmissionDto } from './dto/update-quiz-submission.dto';
import { QuizSubmissionQueryDto } from './dto/quiz-submission-query.dto';

describe('QuizSubmissionsService', () => {
  let service: QuizSubmissionsService;
  let prismaService: PrismaService;

  const mockParticipation = {
    id: 1,
    user_id: 1,
    context_id: 1,
    active: true,
  };

  const mockForm = {
    id: 1,
    title: 'Test Quiz',
    type: 'quiz',
    reference: 'TEST_QUIZ',
    context_id: 1,
    active: true,
  };

  const mockFormVersion = {
    id: 1,
    form_id: 1,
    version_number: 1,
    definition: {
      fields: [
        {
          id: 'q1',
          name: 'question1',
          type: 'select',
          label: 'Questão 1',
          points: 1,
          correctAnswer: 'a',
          options: [
            { label: 'Opção A', value: 'a' },
            { label: 'Opção B', value: 'b' },
          ],
        },
      ],
    },
    passing_score: 70,
    max_attempts: 3,
    time_limit_minutes: 30,
    show_feedback: true,
    randomize_questions: false,
    active: true,
    form: mockForm,
  };

  const mockQuizSubmission = {
    id: 1,
    participation_id: 1,
    form_version_id: 1,
    quiz_response: { question1: 'a' },
    question_results: [
      {
        questionName: 'question1',
        isCorrect: true,
        pointsEarned: 1,
        pointsTotal: 1,
        userAnswer: 'a',
        correctAnswer: 'a',
      },
    ],
    score: 100,
    percentage: 100,
    is_passed: true,
    attempt_number: 1,
    time_spent_seconds: 120,
    started_at: new Date('2024-01-01T10:00:00Z'),
    completed_at: new Date('2024-01-01T10:02:00Z'),
    active: true,
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:02:00Z'),
    participation: {
      id: 1,
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      },
    },
    form_version: {
      id: 1,
      version_number: 1,
      form: {
        id: 1,
        title: 'Test Quiz',
        reference: 'TEST_QUIZ',
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizSubmissionsService,
        {
          provide: PrismaService,
          useValue: {
            participation: {
              findUnique: jest.fn(),
            },
            form_version: {
              findUnique: jest.fn(),
            },
            quiz_submission: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuizSubmissionsService>(QuizSubmissionsService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateQuizSubmissionDto = {
      participationId: 1,
      formVersionId: 1,
      quizResponse: { question1: 'a' },
      startedAt: '2024-01-01T10:00:00Z',
      completedAt: '2024-01-01T10:02:00Z',
      timeSpentSeconds: 120,
    };

    it('deve criar submissão com sucesso', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('score', 100);
      expect(result).toHaveProperty('isPassed', true);
      expect(prismaService.quiz_submission.create).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando participação não existe', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Participação com ID 1 não encontrada',
      );
    });

    it('deve lançar BadRequestException quando formVersion não existe', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando form não é do tipo quiz', async () => {
      const nonQuizForm = { ...mockForm, type: 'signal' };
      const nonQuizFormVersion = { ...mockFormVersion, form: nonQuizForm };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(nonQuizFormVersion as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'não é do tipo quiz',
      );
    });

    it('deve lançar BadRequestException quando limite de tentativas foi atingido', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(3); // Já atingiu o limite

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Limite de tentativas',
      );
    });

    it('deve calcular número da tentativa corretamente', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue({ attempt_number: 2 } as any);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.create(createDto);

      expect(prismaService.quiz_submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attempt_number: 3,
          }),
        }),
      );
    });

    it('deve usar attempt_number 1 quando não há submissões anteriores', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.create(createDto);

      expect(prismaService.quiz_submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attempt_number: 1,
          }),
        }),
      );
    });

    it('deve lançar BadRequestException quando tempo limite foi excedido', async () => {
      const formVersionWithTimeLimit = {
        ...mockFormVersion,
        time_limit_minutes: 1, // 1 minuto
      };

      const createDtoWithLongTime: CreateQuizSubmissionDto = {
        ...createDto,
        startedAt: '2024-01-01T10:00:00Z',
        completedAt: '2024-01-01T10:02:00Z', // 2 minutos depois
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(formVersionWithTimeLimit as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);

      await expect(service.create(createDtoWithLongTime)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDtoWithLongTime)).rejects.toThrow(
        'Tempo limite',
      );
    });

    it('deve calcular pontuação quando quiz foi completado', async () => {
      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await service.create(createDto);

      expect(result.score).toBeDefined();
      expect(result.percentage).toBeDefined();
      expect(result.questionResults).toBeDefined();
    });

    it('deve determinar isPassed baseado em passing_score', async () => {
      const formVersionWithPassingScore = {
        ...mockFormVersion,
        passing_score: 70,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(formVersionWithPassingScore as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.create(createDto);

      expect(prismaService.quiz_submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            is_passed: expect.any(Boolean),
          }),
        }),
      );
    });

    it('deve considerar 100% como aprovado quando não há passing_score', async () => {
      const formVersionWithoutPassingScore = {
        ...mockFormVersion,
        passing_score: null,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(formVersionWithoutPassingScore as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.create(createDto);

      expect(prismaService.quiz_submission.create).toHaveBeenCalled();
    });

    it('não deve calcular pontuação quando quiz não foi completado', async () => {
      const createDtoIncomplete: CreateQuizSubmissionDto = {
        ...createDto,
        completedAt: undefined,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue({
          ...mockQuizSubmission,
          score: null,
          percentage: null,
          is_passed: null,
        } as any);

      const result = await service.create(createDtoIncomplete);

      expect(result.score).toBeNull();
      expect(result.percentage).toBeNull();
      expect(result.isPassed).toBeNull();
    });

    it('deve calcular timeSpentSeconds quando não fornecido', async () => {
      const createDtoWithoutTime: CreateQuizSubmissionDto = {
        ...createDto,
        timeSpentSeconds: undefined,
      };

      jest
        .spyOn(prismaService.participation, 'findUnique')
        .mockResolvedValue(mockParticipation as any);
      jest
        .spyOn(prismaService.form_version, 'findUnique')
        .mockResolvedValue(mockFormVersion as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(prismaService.quiz_submission, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.quiz_submission, 'create')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.create(createDtoWithoutTime);

      expect(prismaService.quiz_submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            time_spent_seconds: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de submissões', async () => {
      const query: QuizSubmissionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([mockQuizSubmission] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
      expect(result.data).toHaveLength(1);
    });

    it('deve filtrar por participationId', async () => {
      const query: QuizSubmissionQueryDto = {
        participationId: 1,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.quiz_submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            participation_id: 1,
          }),
        }),
      );
    });

    it('deve filtrar por formVersionId', async () => {
      const query: QuizSubmissionQueryDto = {
        formVersionId: 1,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.quiz_submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            form_version_id: 1,
          }),
        }),
      );
    });

    it('deve filtrar por isPassed', async () => {
      const query: QuizSubmissionQueryDto = {
        isPassed: true,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.quiz_submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_passed: true,
          }),
        }),
      );
    });

    it('deve filtrar por active quando fornecido', async () => {
      const query: QuizSubmissionQueryDto = {
        active: false,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.quiz_submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
          }),
        }),
      );
    });

    it('deve usar active=true por padrão quando active não é fornecido', async () => {
      const query: QuizSubmissionQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.quiz_submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('deve filtrar por intervalo de datas', async () => {
      const query: QuizSubmissionQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.quiz_submission, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.quiz_submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completed_at: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar submissão quando encontrada', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(prismaService.quiz_submission.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
    });

    it('deve lançar NotFoundException quando submissão não existe', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Submissão de quiz com ID 999 não encontrada',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateQuizSubmissionDto = {
      quizResponse: { question1: 'b' },
    };

    it('deve atualizar submissão com sucesso', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue({
          ...mockQuizSubmission,
          form_version: mockFormVersion,
        } as any);
      jest
        .spyOn(prismaService.quiz_submission, 'update')
        .mockResolvedValue(mockQuizSubmission as any);

      const result = await service.update(1, updateDto);

      expect(result).toHaveProperty('id', 1);
      expect(prismaService.quiz_submission.update).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando submissão não existe', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve recalcular pontuação quando quizResponse é atualizado e quiz foi completado', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue({
          ...mockQuizSubmission,
          completed_at: new Date('2024-01-01T10:02:00Z'),
          form_version: mockFormVersion,
        } as any);
      jest
        .spyOn(prismaService.quiz_submission, 'update')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.update(1, updateDto);

      expect(prismaService.quiz_submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            score: expect.any(Number),
            percentage: expect.any(Number),
            question_results: expect.any(Array),
          }),
        }),
      );
    });

    it('deve atualizar completedAt e recalcular pontuação', async () => {
      const updateDtoWithCompleted: UpdateQuizSubmissionDto = {
        completedAt: '2024-01-01T10:05:00Z',
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue({
          ...mockQuizSubmission,
          completed_at: null,
          form_version: mockFormVersion,
        } as any);
      jest
        .spyOn(prismaService.quiz_submission, 'update')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.update(1, updateDtoWithCompleted);

      expect(prismaService.quiz_submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            completed_at: expect.any(Date),
            score: expect.any(Number),
          }),
        }),
      );
    });

    it('deve atualizar timeSpentSeconds quando fornecido', async () => {
      const updateDtoWithTime: UpdateQuizSubmissionDto = {
        timeSpentSeconds: 300,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue({
          ...mockQuizSubmission,
          form_version: mockFormVersion,
        } as any);
      jest
        .spyOn(prismaService.quiz_submission, 'update')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.update(1, updateDtoWithTime);

      expect(prismaService.quiz_submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            time_spent_seconds: 300,
          }),
        }),
      );
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateDtoWithActive: UpdateQuizSubmissionDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue({
          ...mockQuizSubmission,
          form_version: mockFormVersion,
        } as any);
      jest
        .spyOn(prismaService.quiz_submission, 'update')
        .mockResolvedValue(mockQuizSubmission as any);

      await service.update(1, updateDtoWithActive);

      expect(prismaService.quiz_submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: false,
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete da submissão', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue(mockQuizSubmission as any);
      jest
        .spyOn(prismaService.quiz_submission, 'update')
        .mockResolvedValue({
          ...mockQuizSubmission,
          active: false,
        } as any);

      await service.remove(1);

      expect(prismaService.quiz_submission.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando submissão não existe', async () => {
      jest
        .spyOn(prismaService.quiz_submission, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

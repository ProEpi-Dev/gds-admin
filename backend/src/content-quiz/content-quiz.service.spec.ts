import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ContentQuizService } from './content-quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentQuizDto } from './dto/create-content-quiz.dto';
import { UpdateContentQuizDto } from './dto/update-content-quiz.dto';
import { ContentQuizQueryDto } from './dto/content-quiz-query.dto';

describe('ContentQuizService', () => {
  let service: ContentQuizService;
  let prismaService: PrismaService;

  const mockContent = {
    id: 1,
    title: 'Test Content',
    reference: 'TEST_CONTENT',
    active: true,
  };

  const mockForm = {
    id: 1,
    title: 'Test Quiz',
    type: 'quiz',
    reference: 'TEST_QUIZ',
    active: true,
  };

  const mockContentQuiz = {
    id: 1,
    content_id: 1,
    form_id: 1,
    display_order: 0,
    is_required: false,
    weight: 1.0,
    active: true,
    created_at: new Date(),
    updated_at: new Date(),
    content: mockContent,
    form: mockForm,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentQuizService,
        {
          provide: PrismaService,
          useValue: {
            content: {
              findUnique: jest.fn(),
            },
            form: {
              findUnique: jest.fn(),
            },
            content_quiz: {
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

    service = module.get<ContentQuizService>(ContentQuizService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateContentQuizDto = {
      contentId: 1,
      formId: 1,
      displayOrder: 0,
      isRequired: false,
      weight: 1.0,
    };

    it('deve criar associação com sucesso', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.content_quiz, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.content_quiz, 'create')
        .mockResolvedValue(mockContentQuiz as any);

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('contentId', 1);
      expect(result).toHaveProperty('formId', 1);
      expect(prismaService.content_quiz.create).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando conteúdo não existe', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Conteúdo com ID 1 não encontrado',
      );
    });

    it('deve lançar BadRequestException quando formulário não existe', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Formulário com ID 1 não encontrado',
      );
    });

    it('deve lançar BadRequestException quando formulário não é do tipo quiz', async () => {
      const nonQuizForm = { ...mockForm, type: 'signal' };

      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(nonQuizForm as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'não é do tipo quiz',
      );
    });

    it('deve lançar BadRequestException quando associação já existe', async () => {
      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.content_quiz, 'findFirst')
        .mockResolvedValue(mockContentQuiz as any);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Já existe uma associação',
      );
    });

    it('deve usar valores padrão quando opcionais não são fornecidos', async () => {
      const createDtoMinimal: CreateContentQuizDto = {
        contentId: 1,
        formId: 1,
      };

      jest
        .spyOn(prismaService.content, 'findUnique')
        .mockResolvedValue(mockContent as any);
      jest
        .spyOn(prismaService.form, 'findUnique')
        .mockResolvedValue(mockForm as any);
      jest
        .spyOn(prismaService.content_quiz, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.content_quiz, 'create')
        .mockResolvedValue(mockContentQuiz as any);

      await service.create(createDtoMinimal);

      expect(prismaService.content_quiz.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            display_order: 0,
            is_required: false,
            weight: 1.0,
            active: true,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de associações', async () => {
      const query: ContentQuizQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findMany')
        .mockResolvedValue([mockContentQuiz] as any);
      jest
        .spyOn(prismaService.content_quiz, 'count')
        .mockResolvedValue(1);

      const result = await service.findAll(query);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('links');
      expect(result.data).toHaveLength(1);
    });

    it('deve filtrar por contentId', async () => {
      const query: ContentQuizQueryDto = {
        contentId: 1,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.content_quiz, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.content_quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content_id: 1,
          }),
        }),
      );
    });

    it('deve filtrar por formId', async () => {
      const query: ContentQuizQueryDto = {
        formId: 1,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.content_quiz, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.content_quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            form_id: 1,
          }),
        }),
      );
    });

    it('deve filtrar por active quando fornecido', async () => {
      const query: ContentQuizQueryDto = {
        active: false,
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.content_quiz, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.content_quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: false,
          }),
        }),
      );
    });

    it('deve usar active=true por padrão quando active não é fornecido', async () => {
      const query: ContentQuizQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.content_quiz, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.content_quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
          }),
        }),
      );
    });

    it('deve ordenar por content_id e display_order', async () => {
      const query: ContentQuizQueryDto = {
        page: 1,
        pageSize: 20,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findMany')
        .mockResolvedValue([] as any);
      jest
        .spyOn(prismaService.content_quiz, 'count')
        .mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaService.content_quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { content_id: 'asc' },
            { display_order: 'asc' },
          ],
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar associação quando encontrada', async () => {
      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(mockContentQuiz as any);

      const result = await service.findOne(1);

      expect(result).toHaveProperty('id', 1);
      expect(prismaService.content_quiz.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object),
      });
    });

    it('deve lançar NotFoundException quando associação não existe', async () => {
      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Associação conteúdo-quiz com ID 999 não encontrada',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateContentQuizDto = {
      displayOrder: 1,
      isRequired: true,
      weight: 2.0,
    };

    it('deve atualizar associação com sucesso', async () => {
      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(mockContentQuiz as any);
      jest
        .spyOn(prismaService.content_quiz, 'update')
        .mockResolvedValue(mockContentQuiz as any);

      const result = await service.update(1, updateDto);

      expect(result).toHaveProperty('id', 1);
      expect(prismaService.content_quiz.update).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando associação não existe', async () => {
      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const updateDtoPartial: UpdateContentQuizDto = {
        displayOrder: 2,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(mockContentQuiz as any);
      jest
        .spyOn(prismaService.content_quiz, 'update')
        .mockResolvedValue(mockContentQuiz as any);

      await service.update(1, updateDtoPartial);

      expect(prismaService.content_quiz.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            display_order: 2,
          }),
        }),
      );
    });

    it('deve atualizar active quando fornecido', async () => {
      const updateDtoWithActive: UpdateContentQuizDto = {
        active: false,
      };

      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(mockContentQuiz as any);
      jest
        .spyOn(prismaService.content_quiz, 'update')
        .mockResolvedValue(mockContentQuiz as any);

      await service.update(1, updateDtoWithActive);

      expect(prismaService.content_quiz.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: false,
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete da associação', async () => {
      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(mockContentQuiz as any);
      jest
        .spyOn(prismaService.content_quiz, 'update')
        .mockResolvedValue({
          ...mockContentQuiz,
          active: false,
        } as any);

      await service.remove(1);

      expect(prismaService.content_quiz.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false },
      });
    });

    it('deve lançar NotFoundException quando associação não existe', async () => {
      jest
        .spyOn(prismaService.content_quiz, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

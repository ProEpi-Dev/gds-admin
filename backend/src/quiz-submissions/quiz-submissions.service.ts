import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackProgressService } from '../track-progress/track-progress.service';
import { CreateQuizSubmissionDto } from './dto/create-quiz-submission.dto';
import { UpdateQuizSubmissionDto } from './dto/update-quiz-submission.dto';
import { QuizSubmissionQueryDto } from './dto/quiz-submission-query.dto';
import { QuizSubmissionResponseDto } from './dto/quiz-submission-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import {
  createPaginationMeta,
  createPaginationLinks,
} from '../common/helpers/pagination.helper';

interface QuizQuestionOption {
  label: string;
  value: string | number;
  feedback?: string;
}

interface QuizQuestion {
  id?: string;
  type: string;
  name: string;
  points?: number;
  weight?: number;
  correctAnswer?: any;
  explanation?: string;
  options?: QuizQuestionOption[];
  feedback?: {
    correct?: string;
    incorrect?: string;
  };
}

interface QuizDefinition {
  fields: QuizQuestion[];
  scoring?: {
    method?: 'weighted' | 'simple';
    totalPoints?: number;
  };
}

@Injectable()
export class QuizSubmissionsService {
  constructor(
    private prisma: PrismaService,
    private trackProgressService: TrackProgressService,
  ) {}

  async create(
    createQuizSubmissionDto: CreateQuizSubmissionDto,
  ): Promise<QuizSubmissionResponseDto> {
    // Validar participação
    const participation = await this.prisma.participation.findUnique({
      where: { id: createQuizSubmissionDto.participationId },
    });

    if (!participation) {
      throw new BadRequestException(
        `Participação com ID ${createQuizSubmissionDto.participationId} não encontrada`,
      );
    }

    // Validar versão do formulário e verificar se é quiz
    const formVersion = await this.prisma.form_version.findUnique({
      where: { id: createQuizSubmissionDto.formVersionId },
      include: {
        form: true,
      },
    });

    if (!formVersion) {
      throw new BadRequestException(
        `Versão do formulário com ID ${createQuizSubmissionDto.formVersionId} não encontrada`,
      );
    }

    if (formVersion.form.type !== 'quiz') {
      throw new BadRequestException(
        `Formulário com ID ${formVersion.form_id} não é do tipo quiz`,
      );
    }

    // Verificar limite de tentativas
    if (formVersion.max_attempts !== null) {
      const existingSubmissions = await this.prisma.quiz_submission.count({
        where: {
          participation_id: createQuizSubmissionDto.participationId,
          form_version_id: createQuizSubmissionDto.formVersionId,
          active: true,
        },
      });

      if (existingSubmissions >= formVersion.max_attempts) {
        throw new BadRequestException(
          `Limite de tentativas (${formVersion.max_attempts}) já foi atingido`,
        );
      }
    }

    // Calcular número da tentativa
    const lastSubmission = await this.prisma.quiz_submission.findFirst({
      where: {
        participation_id: createQuizSubmissionDto.participationId,
        form_version_id: createQuizSubmissionDto.formVersionId,
      },
      orderBy: {
        attempt_number: 'desc',
      },
    });

    const attemptNumber = lastSubmission
      ? lastSubmission.attempt_number + 1
      : 1;

    // Validar tempo limite se definido
    const startedAt = new Date(createQuizSubmissionDto.startedAt);
    const completedAt = createQuizSubmissionDto.completedAt
      ? new Date(createQuizSubmissionDto.completedAt)
      : null;

    if (
      formVersion.time_limit_minutes !== null &&
      completedAt &&
      formVersion.time_limit_minutes > 0
    ) {
      const timeSpentMinutes =
        (completedAt.getTime() - startedAt.getTime()) / (1000 * 60);
      if (timeSpentMinutes > formVersion.time_limit_minutes) {
        throw new BadRequestException(
          `Tempo limite (${formVersion.time_limit_minutes} minutos) foi excedido`,
        );
      }
    }

    // Calcular pontuação se o quiz foi completado
    let score: number | null = null;
    let percentage: number | null = null;
    let isPassed: boolean | null = null;
    let questionResults: any = null;

    if (completedAt) {
      const scoringResult = this.calculateScore(
        formVersion.definition as unknown as QuizDefinition,
        createQuizSubmissionDto.quizResponse,
      );
      score = scoringResult.score;
      percentage = scoringResult.percentage;
      questionResults = scoringResult.questionResults;

      // Determinar aprovação
      if (formVersion.passing_score !== null) {
        isPassed = score >= Number(formVersion.passing_score);
      } else {
        // Se não houver nota mínima configurada, considerar 100% como aprovado
        isPassed = percentage === 100;
      }
    }

    // Calcular tempo gasto se não fornecido
    let timeSpentSeconds = createQuizSubmissionDto.timeSpentSeconds;
    if (!timeSpentSeconds && completedAt) {
      timeSpentSeconds = Math.floor(
        (completedAt.getTime() - startedAt.getTime()) / 1000,
      );
    }

    // Criar submissão
    const quizSubmission = await this.prisma.quiz_submission.create({
      data: {
        participation_id: createQuizSubmissionDto.participationId,
        form_version_id: createQuizSubmissionDto.formVersionId,
        quiz_response: createQuizSubmissionDto.quizResponse,
        question_results: questionResults,
        score: score !== null ? score : null,
        percentage: percentage !== null ? percentage : null,
        is_passed: isPassed,
        attempt_number: attemptNumber,
        time_spent_seconds: timeSpentSeconds,
        started_at: startedAt,
        completed_at: completedAt,
        active: createQuizSubmissionDto.active ?? true,
      },
    });

    // Se contexto de trilha foi informado, vincular submissão ao sequence_progress e marcar sequência como concluída (operação atômica na mesma requisição)
    const { trackProgressId, sequenceId } = createQuizSubmissionDto;
    if (
      trackProgressId != null &&
      sequenceId != null &&
      createQuizSubmissionDto.completedAt
    ) {
      await this.trackProgressService.completeQuizSequence(
        trackProgressId,
        sequenceId,
        quizSubmission.id,
      );
    }

    return this.mapToResponseDto(quizSubmission);
  }

  async findAll(
    query: QuizSubmissionQueryDto,
  ): Promise<ListResponseDto<QuizSubmissionResponseDto>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Construir filtros
    const where: any = {};

    if (query.active !== undefined) {
      where.active = query.active;
    } else {
      // Por padrão, mostrar apenas submissões ativas
      where.active = true;
    }

    if (query.participationId !== undefined) {
      where.participation_id = query.participationId;
    }

    if (query.formVersionId !== undefined) {
      where.form_version_id = query.formVersionId;
    }

    if (query.formId !== undefined) {
      where.form_version = {
        form_id: query.formId,
      };
    }

    if (query.isPassed !== undefined) {
      where.is_passed = query.isPassed;
    }

    if (query.startDate !== undefined || query.endDate !== undefined) {
      where.completed_at = {};
      if (query.startDate !== undefined) {
        where.completed_at.gte = new Date(query.startDate);
      }
      if (query.endDate !== undefined) {
        where.completed_at.lte = new Date(query.endDate);
      }
    }

    // Buscar submissões e total
    const [quizSubmissions, totalItems] = await Promise.all([
      this.prisma.quiz_submission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { completed_at: 'desc' },
          { created_at: 'desc' },
        ],
        include: {
          participation: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          form_version: {
            select: {
              id: true,
              version_number: true,
              form: {
                select: {
                  id: true,
                  title: true,
                  reference: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.quiz_submission.count({ where }),
    ]);

    // Criar resposta paginada
    const baseUrl = '/v1/quiz-submissions';
    const queryParams: Record<string, any> = {};
    if (query.active !== undefined) queryParams.active = query.active;
    if (query.participationId !== undefined)
      queryParams.participationId = query.participationId;
    if (query.formVersionId !== undefined)
      queryParams.formVersionId = query.formVersionId;
    if (query.formId !== undefined) queryParams.formId = query.formId;
    if (query.isPassed !== undefined) queryParams.isPassed = query.isPassed;
    if (query.startDate !== undefined) queryParams.startDate = query.startDate;
    if (query.endDate !== undefined) queryParams.endDate = query.endDate;

    return {
      data: quizSubmissions.map((qs) => this.mapToResponseDto(qs)),
      meta: createPaginationMeta({
        page,
        pageSize,
        totalItems,
        baseUrl,
        queryParams,
      }),
      links: createPaginationLinks({
        page,
        pageSize,
        totalItems,
        baseUrl,
        queryParams,
      }),
    };
  }

  async findOne(id: number): Promise<QuizSubmissionResponseDto> {
    const quizSubmission = await this.prisma.quiz_submission.findUnique({
      where: { id },
      include: {
        participation: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        form_version: {
          select: {
            id: true,
            version_number: true,
            form: {
              select: {
                id: true,
                title: true,
                reference: true,
              },
            },
          },
        },
      },
    });

    if (!quizSubmission) {
      throw new NotFoundException(
        `Submissão de quiz com ID ${id} não encontrada`,
      );
    }

    return this.mapToResponseDto(quizSubmission);
  }

  async update(
    id: number,
    updateQuizSubmissionDto: UpdateQuizSubmissionDto,
  ): Promise<QuizSubmissionResponseDto> {
    // Verificar se submissão existe
    const existing = await this.prisma.quiz_submission.findUnique({
      where: { id },
      include: {
        form_version: {
          include: {
            form: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Submissão de quiz com ID ${id} não encontrada`,
      );
    }

    // Preparar dados de atualização
    const updateData: any = {};

    if (updateQuizSubmissionDto.quizResponse !== undefined) {
      updateData.quiz_response = updateQuizSubmissionDto.quizResponse;

      // Recalcular pontuação se quiz foi completado
      if (existing.completed_at || updateQuizSubmissionDto.completedAt) {
        const completedAt = updateQuizSubmissionDto.completedAt
          ? new Date(updateQuizSubmissionDto.completedAt)
          : existing.completed_at;

        if (completedAt) {
          const scoringResult = this.calculateScore(
            existing.form_version.definition as unknown as QuizDefinition,
            updateQuizSubmissionDto.quizResponse,
          );
          updateData.score = scoringResult.score;
          updateData.percentage = scoringResult.percentage;
          updateData.question_results = scoringResult.questionResults;

          // Determinar aprovação
          if (existing.form_version.passing_score !== null) {
            updateData.is_passed =
              scoringResult.score >= Number(existing.form_version.passing_score);
          } else {
            // Se não houver nota mínima configurada, considerar 100% como aprovado
            updateData.is_passed = scoringResult.percentage === 100;
          }
        }
      }
    }

    if (updateQuizSubmissionDto.completedAt !== undefined) {
      updateData.completed_at = new Date(updateQuizSubmissionDto.completedAt);

      // Recalcular pontuação se ainda não foi calculada
      if (!updateData.score && existing.quiz_response) {
        const scoringResult = this.calculateScore(
          existing.form_version.definition as unknown as QuizDefinition,
          existing.quiz_response as any,
        );
        updateData.score = scoringResult.score;
        updateData.percentage = scoringResult.percentage;
        updateData.question_results = scoringResult.questionResults;

        if (existing.form_version.passing_score !== null) {
          updateData.is_passed =
            scoringResult.score >= Number(existing.form_version.passing_score);
        }
      }

      // Calcular tempo gasto
      if (updateData.completed_at && existing.started_at) {
        updateData.time_spent_seconds = Math.floor(
          (updateData.completed_at.getTime() -
            existing.started_at.getTime()) /
            1000,
        );
      }
    }

    if (updateQuizSubmissionDto.timeSpentSeconds !== undefined) {
      updateData.time_spent_seconds = updateQuizSubmissionDto.timeSpentSeconds;
    }

    if (updateQuizSubmissionDto.active !== undefined) {
      updateData.active = updateQuizSubmissionDto.active;
    }

    // Atualizar submissão
    const quizSubmission = await this.prisma.quiz_submission.update({
      where: { id },
      data: updateData,
      include: {
        participation: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        form_version: {
          select: {
            id: true,
            version_number: true,
            form: {
              select: {
                id: true,
                title: true,
                reference: true,
              },
            },
          },
        },
      },
    });

    return this.mapToResponseDto(quizSubmission);
  }

  async remove(id: number): Promise<void> {
    // Verificar se submissão existe
    const quizSubmission = await this.prisma.quiz_submission.findUnique({
      where: { id },
    });

    if (!quizSubmission) {
      throw new NotFoundException(
        `Submissão de quiz com ID ${id} não encontrada`,
      );
    }

    // Soft delete
    await this.prisma.quiz_submission.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * Calcula a pontuação do quiz baseado nas respostas
   * Retorna score, percentage e resultados detalhados por questão
   */
  private calculateScore(
    definition: QuizDefinition,
    responses: any,
  ): {
    score: number;
    percentage: number;
    questionResults: Array<{
      questionName: string;
      questionId?: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsTotal: number;
      userAnswer: any;
      correctAnswer: any;
      feedback?: string;
    }>;
  } {
    if (!definition.fields || !Array.isArray(definition.fields)) {
      return {
        score: 0,
        percentage: 0,
        questionResults: [],
      };
    }

    const scoringMethod =
      definition.scoring?.method || 'simple';
    let totalPoints = 0;
    let obtainedPoints = 0;
    const questionResults: Array<{
      questionName: string;
      questionId?: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsTotal: number;
      userAnswer: any;
      correctAnswer: any;
      feedback?: string;
    }> = [];

    for (const question of definition.fields) {
      const questionPoints = question.points || 1;
      const questionWeight = question.weight || 1;
      const pointsTotal = scoringMethod === 'weighted'
        ? questionPoints * questionWeight
        : questionPoints;
      totalPoints += pointsTotal;

      const userAnswer = responses[question.name];
      const correctAnswer = question.correctAnswer;
      const isCorrect = this.isAnswerCorrect(
        userAnswer,
        correctAnswer,
        question.type,
      );

      // Calcular pontos ganhos
      const pointsEarned = isCorrect ? pointsTotal : 0;
      if (isCorrect) {
        obtainedPoints += pointsEarned;
      }

      // Determinar feedback
      let feedback: string | undefined;
      
      // Prioridade 1: Feedback da opção selecionada (se for select/multiselect)
      if ((question.type === 'select' || question.type === 'multiselect') && question.options) {
        if (Array.isArray(userAnswer)) {
          // Multiselect: combinar feedbacks de todas as opções selecionadas
          const selectedOptions = question.options.filter(opt => 
            userAnswer.includes(opt.value)
          );
          const feedbacks = selectedOptions
            .map(opt => opt.feedback)
            .filter((fb): fb is string => !!fb);
          if (feedbacks.length > 0) {
            feedback = feedbacks.join('\n\n'); // Combinar múltiplos feedbacks
          }
        } else {
          // Select: pegar feedback da opção selecionada
          const selectedOption = question.options.find(opt => opt.value === userAnswer);
          if (selectedOption?.feedback) {
            feedback = selectedOption.feedback;
          }
        }
      }
      
      // Prioridade 2: Feedback geral (correct/incorrect) - apenas se não tiver feedback por opção
      if (!feedback && question.feedback) {
        feedback = isCorrect
          ? question.feedback.correct
          : question.feedback.incorrect;
      }

      questionResults.push({
        questionName: question.name,
        questionId: question.id,
        isCorrect,
        pointsEarned,
        pointsTotal,
        userAnswer,
        correctAnswer,
        feedback,
      });
    }

    // Calcular percentual
    const percentage =
      totalPoints > 0 ? (obtainedPoints / totalPoints) * 100 : 0;
    const score = Math.round(percentage * 100) / 100; // Arredondar para 2 casas decimais

    return { score, percentage, questionResults };
  }

  /**
   * Verifica se a resposta está correta
   */
  private isAnswerCorrect(
    userAnswer: any,
    correctAnswer: any,
    questionType: string,
  ): boolean {
    if (userAnswer === undefined || userAnswer === null) {
      return false;
    }

    if (correctAnswer === undefined || correctAnswer === null) {
      return false;
    }

    // Comparação baseada no tipo
    switch (questionType) {
      case 'multiselect':
        if (!Array.isArray(userAnswer) || !Array.isArray(correctAnswer)) {
          return false;
        }
        // Ordenar arrays para comparação
        const sortedUser = [...userAnswer].sort();
        const sortedCorrect = [...correctAnswer].sort();
        return (
          sortedUser.length === sortedCorrect.length &&
          sortedUser.every((val, idx) => val === sortedCorrect[idx])
        );
      case 'select':
      case 'text':
      case 'number':
      case 'boolean':
        return userAnswer === correctAnswer;
      default:
        return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    }
  }

  private mapToResponseDto(quizSubmission: any): QuizSubmissionResponseDto {
    return {
      id: quizSubmission.id,
      participationId: quizSubmission.participation_id,
      formVersionId: quizSubmission.form_version_id,
      quizResponse: quizSubmission.quiz_response,
      questionResults: quizSubmission.question_results || null,
      score: quizSubmission.score !== null ? Number(quizSubmission.score) : null,
      percentage:
        quizSubmission.percentage !== null
          ? Number(quizSubmission.percentage)
          : null,
      isPassed: quizSubmission.is_passed,
      attemptNumber: quizSubmission.attempt_number,
      timeSpentSeconds: quizSubmission.time_spent_seconds,
      startedAt: quizSubmission.started_at,
      completedAt: quizSubmission.completed_at,
      active: quizSubmission.active,
      createdAt: quizSubmission.created_at,
      updatedAt: quizSubmission.updated_at,
      participation: quizSubmission.participation
        ? {
            id: quizSubmission.participation.id,
            user: quizSubmission.participation.user
              ? {
                  id: quizSubmission.participation.user.id,
                  name: quizSubmission.participation.user.name,
                  email: quizSubmission.participation.user.email,
                }
              : undefined,
          }
        : undefined,
      formVersion: quizSubmission.form_version
        ? {
            id: quizSubmission.form_version.id,
            versionNumber: quizSubmission.form_version.version_number,
            form: quizSubmission.form_version.form
              ? {
                  id: quizSubmission.form_version.form.id,
                  title: quizSubmission.form_version.form.title,
                  reference: quizSubmission.form_version.form.reference,
                }
              : undefined,
          }
        : undefined,
    };
  }
}


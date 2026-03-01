import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuizSubmissionsService } from './quiz-submissions.service';
import { CreateQuizSubmissionDto } from './dto/create-quiz-submission.dto';
import { UpdateQuizSubmissionDto } from './dto/update-quiz-submission.dto';
import { QuizSubmissionQueryDto } from './dto/quiz-submission-query.dto';
import { QuizSubmissionResponseDto } from './dto/quiz-submission-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Quiz-Submissions')
@ApiBearerAuth('bearerAuth')
@Controller('quiz-submissions')
export class QuizSubmissionsController {
  constructor(
    private readonly quizSubmissionsService: QuizSubmissionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar submissão de quiz',
    description:
      'Cria uma nova submissão de quiz. A pontuação é calculada automaticamente se o quiz foi completado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Submissão criada com sucesso',
    type: QuizSubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Dados inválidos, limite de tentativas atingido ou tempo limite excedido',
  })
  async create(
    @Body() createQuizSubmissionDto: CreateQuizSubmissionDto,
    @CurrentUser() user: any,
  ): Promise<QuizSubmissionResponseDto> {
    return this.quizSubmissionsService.create(createQuizSubmissionDto, user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager', 'participant')
  @ApiOperation({
    summary: 'Listar submissões de quiz',
    description:
      'Admin/manager/content_manager: submissões do contexto. Participant: apenas as próprias submissões.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de submissões',
    type: ListResponseDto<QuizSubmissionResponseDto>,
  })
  async findAll(
    @Query() query: QuizSubmissionQueryDto,
    @CurrentUser() user: any,
  ): Promise<ListResponseDto<QuizSubmissionResponseDto>> {
    return this.quizSubmissionsService.findAll(query, user.userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  @ApiOperation({
    summary: 'Obter submissão por ID',
    description: 'Retorna detalhes de uma submissão específica',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da submissão' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da submissão',
    type: QuizSubmissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Submissão não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<QuizSubmissionResponseDto> {
    return this.quizSubmissionsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  @ApiOperation({
    summary: 'Atualizar submissão',
    description:
      'Atualiza uma submissão existente. A pontuação é recalculada automaticamente se as respostas ou data de conclusão forem atualizadas.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da submissão' })
  @ApiResponse({
    status: 200,
    description: 'Submissão atualizada com sucesso',
    type: QuizSubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Submissão não encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuizSubmissionDto: UpdateQuizSubmissionDto,
    @CurrentUser() user: any,
  ): Promise<QuizSubmissionResponseDto> {
    return this.quizSubmissionsService.update(id, updateQuizSubmissionDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar submissão',
    description: 'Remove uma submissão (soft delete)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da submissão' })
  @ApiResponse({ status: 204, description: 'Submissão deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Submissão não encontrada' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.quizSubmissionsService.remove(id, user.userId);
  }
}

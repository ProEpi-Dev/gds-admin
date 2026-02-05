import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TrackProgressService } from './track-progress.service';
import { StartTrackProgressDto } from './dto/start-track-progress.dto';
import { UpdateSequenceProgressDto } from './dto/update-sequence-progress.dto';
import { TrackProgressQueryDto } from './dto/track-progress-query.dto';
import { TrackExecutionsQueryDto } from './dto/track-executions-query.dto';
import { CompleteQuizDto } from './dto/complete-quiz.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Track Progress')
@Controller('track-progress')
@ApiBearerAuth()
export class TrackProgressController {
  constructor(private readonly trackProgressService: TrackProgressService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar progresso em um ciclo de trilha',
    description:
      'Cria registro de progresso e sequências para um usuário em um ciclo específico',
  })
  @ApiResponse({
    status: 201,
    description: 'Progresso iniciado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Participação não pertence ao contexto do ciclo',
  })
  @ApiResponse({
    status: 404,
    description: 'Participação ou ciclo não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe progresso para este usuário neste ciclo',
  })
  async start(@Body() dto: StartTrackProgressDto) {
    return this.trackProgressService.startTrackProgress(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar progressos',
    description:
      'Lista progressos com filtros opcionais por usuário, ciclo, participação e status',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de progressos',
  })
  async findAll(@Query() query: TrackProgressQueryDto) {
    return this.trackProgressService.findAll(query);
  }

  @Get('my-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Meu progresso',
    description: 'Lista todos os progressos do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de progressos do usuário',
  })
  async getMyProgress(@CurrentUser() user: any) {
    return this.trackProgressService.findAll({ userId: user.id });
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Histórico de ciclos completados',
    description: 'Lista todos os ciclos completados pelo usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ciclos completados',
  })
  async getHistory(@CurrentUser() user: any) {
    return this.trackProgressService.findCompletedByUser(user.id);
  }

  @Get('mandatory-compliance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Conformidade de trilhas obrigatórias',
    description:
      'Para uma participação, lista os slugs obrigatórios do contexto e indica se o usuário já completou um ciclo com cada slug. Usado pelo app e pela tela Welcome para validar regras de trilhas obrigatórias.',
  })
  @ApiQuery({
    name: 'participationId',
    type: Number,
    required: true,
    description: 'ID da participação (deve ser do usuário autenticado)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de itens obrigatórios e status de conclusão',
  })
  @ApiResponse({
    status: 403,
    description: 'Participação não pertence ao usuário autenticado',
  })
  @ApiResponse({
    status: 404,
    description: 'Participação não encontrada',
  })
  async getMandatoryCompliance(
    @Query('participationId', ParseIntPipe) participationId: number,
    @CurrentUser() user: any,
  ) {
    return this.trackProgressService.getMandatoryCompliance(
      participationId,
      user.userId,
    );
  }

  @Get('executions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar execuções (conclusões de sequências)',
    description:
      'Visão geral de conclusões de atividades (quiz/conteúdo) por ciclo, participante e data. Filtros: ciclo, participante, tipo, nome da atividade, período.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de execuções',
  })
  async getExecutions(@Query() query: TrackExecutionsQueryDto) {
    return this.trackProgressService.findExecutions(query);
  }

  @Get('participation/:participationId/cycle/:cycleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar progresso por participação e ciclo',
    description:
      'Retorna progresso detalhado de um usuário em um ciclo específico',
  })
  @ApiParam({
    name: 'participationId',
    type: Number,
    description: 'ID da participação',
  })
  @ApiParam({
    name: 'cycleId',
    type: Number,
    description: 'ID do ciclo',
  })
  @ApiResponse({
    status: 200,
    description: 'Progresso encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Progresso não encontrado',
  })
  async findByUserAndCycle(
    @Param('participationId', ParseIntPipe) participationId: number,
    @Param('cycleId', ParseIntPipe) cycleId: number,
  ) {
    return this.trackProgressService.findByUserAndCycle(
      participationId,
      cycleId,
    );
  }

  @Get(':id/can-access/sequence/:sequenceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar acesso a sequência',
    description:
      'Verifica se o usuário pode acessar uma sequência específica (bloqueio sequencial)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do progresso da trilha',
  })
  @ApiParam({
    name: 'sequenceId',
    type: Number,
    description: 'ID da sequência',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado da verificação de acesso',
  })
  async canAccessSequence(
    @Param('id', ParseIntPipe) trackProgressId: number,
    @Param('sequenceId', ParseIntPipe) sequenceId: number,
  ) {
    // Buscar track_progress para obter participation_id e track_cycle_id
    const trackProgress = await this.trackProgressService.findAll({});
    const progress = trackProgress.find((p) => p.id === trackProgressId);

    if (!progress) {
      return {
        canAccess: false,
        reason: 'Progresso não encontrado',
      };
    }

    return this.trackProgressService.canAccessSequence(
      progress.participation_id,
      progress.track_cycle_id,
      sequenceId,
    );
  }

  @Put(':id/sequence/:sequenceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar progresso de sequência',
    description:
      'Atualiza status, tempo gasto e incrementa contador de visitas de uma sequência',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do progresso da trilha',
  })
  @ApiParam({
    name: 'sequenceId',
    type: Number,
    description: 'ID da sequência',
  })
  @ApiResponse({
    status: 200,
    description: 'Progresso de sequência atualizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Progresso ou sequência não encontrado',
  })
  async updateSequenceProgress(
    @Param('id', ParseIntPipe) trackProgressId: number,
    @Param('sequenceId', ParseIntPipe) sequenceId: number,
    @Body() dto: UpdateSequenceProgressDto,
  ) {
    return this.trackProgressService.updateSequenceProgress(
      trackProgressId,
      sequenceId,
      dto,
    );
  }

  @Post(':id/sequence/:sequenceId/complete-content')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar conteúdo como completado',
    description:
      'Marca uma sequência de conteúdo como completada automaticamente ao visualizar',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do progresso da trilha',
  })
  @ApiParam({
    name: 'sequenceId',
    type: Number,
    description: 'ID da sequência',
  })
  @ApiResponse({
    status: 200,
    description: 'Conteúdo marcado como completado',
  })
  @ApiResponse({
    status: 400,
    description: 'Sequência não é um conteúdo',
  })
  async completeContent(
    @Param('id', ParseIntPipe) trackProgressId: number,
    @Param('sequenceId', ParseIntPipe) sequenceId: number,
  ) {
    return this.trackProgressService.completeContentSequence(
      trackProgressId,
      sequenceId,
    );
  }

  @Post(':id/sequence/:sequenceId/complete-quiz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Marcar quiz como completado',
    description:
      'Marca uma sequência de quiz como completada e vincula a submissão',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do progresso da trilha',
  })
  @ApiParam({
    name: 'sequenceId',
    type: Number,
    description: 'ID da sequência',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz marcado como completado',
  })
  @ApiResponse({
    status: 400,
    description: 'Sequência não é um quiz',
  })
  async completeQuiz(
    @Param('id', ParseIntPipe) trackProgressId: number,
    @Param('sequenceId', ParseIntPipe) sequenceId: number,
    @Body() dto: CompleteQuizDto,
  ) {
    return this.trackProgressService.completeQuizSequence(
      trackProgressId,
      sequenceId,
      dto.quizSubmissionId,
    );
  }

  @Post(':id/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recalcular progresso da trilha',
    description:
      'Força recálculo do percentual de progresso baseado nas sequências completadas',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do progresso da trilha',
  })
  @ApiResponse({
    status: 200,
    description: 'Progresso recalculado',
  })
  async recalculate(@Param('id', ParseIntPipe) trackProgressId: number) {
    return this.trackProgressService.recalculateTrackProgress(trackProgressId);
  }
}

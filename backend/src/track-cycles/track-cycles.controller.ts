import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
import { TrackCyclesService } from './track-cycles.service';
import { CreateTrackCycleDto } from './dto/create-track-cycle.dto';
import { UpdateTrackCycleDto } from './dto/update-track-cycle.dto';
import { UpdateTrackCycleStatusDto } from './dto/update-track-cycle-status.dto';
import { TrackCycleQueryDto } from './dto/track-cycle-query.dto';

@ApiTags('Track Cycles')
@Controller('track-cycles')
@ApiBearerAuth()
export class TrackCyclesController {
  constructor(private readonly trackCyclesService: TrackCyclesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar novo ciclo de trilha',
    description:
      'Cria uma nova instância/oferta de trilha em um contexto específico. Requer permissão de administrador.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ciclo criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um ciclo com este nome para esta trilha/contexto',
  })
  async create(@Body() createDto: CreateTrackCycleDto) {
    return this.trackCyclesService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar ciclos de trilhas',
    description:
      'Lista ciclos com filtros opcionais por contexto, trilha e status',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ciclos',
  })
  async findAll(@Query() query: TrackCycleQueryDto) {
    return this.trackCyclesService.findAll(query);
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar ciclos ativos',
    description:
      'Lista apenas ciclos com status "active" e dentro do período de vigência',
  })
  @ApiQuery({
    name: 'contextId',
    required: false,
    type: Number,
    description: 'ID do contexto para filtrar',
  })
  @ApiQuery({
    name: 'trackId',
    required: false,
    type: Number,
    description: 'ID da trilha para filtrar',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ciclos ativos',
  })
  async findActive(
    @Query('contextId', ParseIntPipe) contextId?: number,
    @Query('trackId', ParseIntPipe) trackId?: number,
  ) {
    return this.trackCyclesService.findActive(contextId, trackId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar ciclo por ID',
    description:
      'Retorna detalhes de um ciclo específico incluindo trilha e seções',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do ciclo',
  })
  @ApiResponse({
    status: 200,
    description: 'Ciclo encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Ciclo não encontrado',
  })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.trackCyclesService.findOne(id);
  }

  @Get(':id/students')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar progresso de alunos no ciclo',
    description:
      'Retorna lista de alunos e seus progressos em um ciclo específico. Requer permissão de professor/administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do ciclo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alunos e progressos',
  })
  @ApiResponse({
    status: 404,
    description: 'Ciclo não encontrado',
  })
  async getStudentsProgress(@Param('id', ParseIntPipe) id: number) {
    return this.trackCyclesService.getStudentsProgress(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar ciclo',
    description:
      'Atualiza informações de um ciclo. Requer permissão de administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do ciclo',
  })
  @ApiResponse({
    status: 200,
    description: 'Ciclo atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ciclo não encontrado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTrackCycleDto,
  ) {
    return this.trackCyclesService.update(id, updateDto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alterar status do ciclo',
    description:
      'Altera o status de um ciclo (draft, active, closed, archived). Requer permissão de administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do ciclo',
  })
  @ApiResponse({
    status: 200,
    description: 'Status alterado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Ciclo não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe outro ciclo ativo para esta trilha/contexto',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() statusDto: UpdateTrackCycleStatusDto,
  ) {
    return this.trackCyclesService.updateStatus(id, statusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deletar ciclo permanentemente',
    description:
      'Remove permanentemente um ciclo do banco de dados (hard delete). ' +
      'Não permite deletar se houver progresso associado. Requer permissão de administrador.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do ciclo',
  })
  @ApiResponse({
    status: 200,
    description: 'Ciclo deletado permanentemente do banco de dados',
  })
  @ApiResponse({
    status: 400,
    description:
      'Não é possível deletar: existem registros de progresso associados. ' +
      'Remova ou migre os registros de progresso primeiro.',
  })
  @ApiResponse({
    status: 404,
    description: 'Ciclo não encontrado',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.trackCyclesService.remove(id);
  }
}

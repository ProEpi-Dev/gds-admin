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
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { ReportsPointsQueryDto } from './dto/reports-points-query.dto';
import { ReportPointResponseDto } from './dto/report-point-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Reports')
@ApiBearerAuth('bearerAuth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar report',
    description: 'Cria um novo report no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Report criado com sucesso',
    type: ReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou entidades relacionadas não encontradas' })
  async create(@Body() createReportDto: CreateReportDto): Promise<ReportResponseDto> {
    return this.reportsService.create(createReportDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar reports',
    description: 'Retorna lista paginada de reports com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reports',
    type: ListResponseDto<ReportResponseDto>,
  })
  async findAll(@Query() query: ReportQueryDto): Promise<ListResponseDto<ReportResponseDto>> {
    return this.reportsService.findAll(query);
  }

  @Get('points')
  @ApiOperation({
    summary: 'Obter pontos de reports para mapa',
    description: 'Retorna latitude, longitude e status de reports ativos em um período específico. Pode ser filtrado por ID do formulário (formId) ou referência do formulário (formReference).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pontos de reports',
    type: [ReportPointResponseDto],
  })
  async findPoints(
    @Query() query: ReportsPointsQueryDto,
  ): Promise<ReportPointResponseDto[]> {
    return this.reportsService.findPoints(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter report por ID',
    description: 'Retorna detalhes de um report específico',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do report' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do report',
    type: ReportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Report não encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ReportResponseDto> {
    return this.reportsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar report',
    description: 'Atualiza um report existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do report' })
  @ApiResponse({
    status: 200,
    description: 'Report atualizado com sucesso',
    type: ReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Report não encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReportDto: UpdateReportDto,
  ): Promise<ReportResponseDto> {
    return this.reportsService.update(id, updateReportDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar report',
    description: 'Remove um report permanentemente do banco de dados (hard delete)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do report' })
  @ApiResponse({ status: 204, description: 'Report deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Report não encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.reportsService.remove(id);
  }
}


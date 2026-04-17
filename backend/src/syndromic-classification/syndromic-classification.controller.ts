import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../authz/decorators/roles.decorator';
import { RolesGuard } from '../authz/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { buildAuditRequestContext } from '../audit-log/audit-request-context.util';
import {
  CreateFormSymptomMappingDto,
  CreateSyndromeDto,
  CreateSyndromeFormConfigDto,
  CreateSyndromeWeightDto,
  CreateSymptomDto,
  DailySyndromeCountsQueryDto,
  ReprocessSyndromicClassificationDto,
  ReportSyndromeScoresQueryDto,
  UpdateFormSymptomMappingDto,
  UpdateSyndromeDto,
  UpdateSyndromeFormConfigDto,
  UpdateSyndromeWeightDto,
  UpdateSymptomDto,
  UpsertSyndromeWeightMatrixDto,
} from './dto/syndromic-classification.dto';
import { SyndromicClassificationService } from './syndromic-classification.service';

@ApiTags('SyndromicClassification')
@ApiBearerAuth('bearerAuth')
@Controller('syndromic-classification')
export class SyndromicClassificationController {
  constructor(
    private readonly service: SyndromicClassificationService,
  ) {}

  @Get('reports/daily-syndrome-counts')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'participant')
  @ApiOperation({
    summary: 'Série diária de totalizadores por síndrome',
  })
  async getDailySyndromeCounts(
    @Query() query: DailySyndromeCountsQueryDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.getDailySyndromeCounts(query, user.userId);
  }

  @Get('reports/scores')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'participant')
  @ApiOperation({
    summary: 'Listar registros da tabela report_syndrome_score',
  })
  async listReportScores(
    @Query() query: ReportSyndromeScoresQueryDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.listReportScores(query, user.userId);
  }

  @Post('reprocess')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Reprocessar classificação sindrômica em lote' })
  async reprocess(
    @Body() dto: ReprocessSyndromicClassificationDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.reprocessReports(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Get('symptoms')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Listar sintomas canônicos' })
  async listSymptoms() {
    return this.service.listSymptoms();
  }

  @Post('symptoms')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Criar sintoma canônico' })
  async createSymptom(
    @Body() dto: CreateSymptomDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.createSymptom(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Patch('symptoms/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Atualizar sintoma canônico' })
  async updateSymptom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSymptomDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.updateSymptom(
      id,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete('symptoms/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar sintoma canônico' })
  async removeSymptom(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<void> {
    await this.service.removeSymptom(id, user.userId, buildAuditRequestContext(req));
  }

  @Get('syndromes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Listar síndromes' })
  async listSyndromes() {
    return this.service.listSyndromes();
  }

  @Post('syndromes')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Criar síndrome' })
  async createSyndrome(
    @Body() dto: CreateSyndromeDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.createSyndrome(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Patch('syndromes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Atualizar síndrome' })
  async updateSyndrome(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSyndromeDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.updateSyndrome(
      id,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete('syndromes/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar síndrome' })
  async removeSyndrome(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<void> {
    await this.service.removeSyndrome(id, user.userId, buildAuditRequestContext(req));
  }

  @Get('syndrome-symptom-weights')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Listar pesos síndrome x sintoma' })
  async listWeights() {
    return this.service.listWeights();
  }

  @Post('syndrome-symptom-weights')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Criar peso síndrome x sintoma' })
  async createWeight(
    @Body() dto: CreateSyndromeWeightDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.createWeight(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Patch('syndrome-symptom-weights/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Atualizar peso síndrome x sintoma' })
  async updateWeight(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSyndromeWeightDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.updateWeight(
      id,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete('syndrome-symptom-weights/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar peso síndrome x sintoma' })
  async removeWeight(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<void> {
    await this.service.removeWeight(id, user.userId, buildAuditRequestContext(req));
  }

  @Get('syndrome-symptom-weights/matrix')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Carregar matriz síndrome x sintoma (estilo planilha)' })
  async getWeightMatrix() {
    return this.service.getWeightMatrix();
  }

  @Put('syndrome-symptom-weights/matrix')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Atualização em lote da matriz síndrome x sintoma' })
  async upsertWeightMatrix(
    @Body() dto: UpsertSyndromeWeightMatrixDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.upsertWeightMatrix(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Get('syndrome-form-configs')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Listar configurações de extração por form_version' })
  async listFormConfigs() {
    return this.service.listFormConfigs();
  }

  @Post('syndrome-form-configs')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Criar configuração de extração por form_version' })
  async createFormConfig(
    @Body() dto: CreateSyndromeFormConfigDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.createFormConfig(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Patch('syndrome-form-configs/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Atualizar configuração de extração por form_version' })
  async updateFormConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSyndromeFormConfigDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.updateFormConfig(
      id,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete('syndrome-form-configs/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar configuração de extração por form_version' })
  async removeFormConfig(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<void> {
    await this.service.removeFormConfig(id, user.userId, buildAuditRequestContext(req));
  }

  @Get('form-symptom-mappings')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Listar mapeamentos de valor de formulário para sintoma' })
  async listFormSymptomMappings() {
    return this.service.listFormSymptomMappings();
  }

  @Post('form-symptom-mappings')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Criar mapeamento de valor de formulário para sintoma' })
  async createFormSymptomMapping(
    @Body() dto: CreateFormSymptomMappingDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.createFormSymptomMapping(
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Patch('form-symptom-mappings/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Atualizar mapeamento de valor de formulário para sintoma' })
  async updateFormSymptomMapping(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFormSymptomMappingDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ) {
    return this.service.updateFormSymptomMapping(
      id,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete('form-symptom-mappings/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar mapeamento de valor de formulário para sintoma' })
  async removeFormSymptomMapping(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<void> {
    await this.service.removeFormSymptomMapping(
      id,
      user.userId,
      buildAuditRequestContext(req),
    );
  }
}

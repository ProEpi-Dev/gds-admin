import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards,
  Req,
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
import { ReportIntegrationsService } from './report-integrations.service';
import {
  IntegrationEventResponseDto,
  IntegrationMessageResponseDto,
} from './dto/integration-event-response.dto';
import { IntegrationEventQueryDto } from './dto/integration-event-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { IntegrationConfigResponseDto } from './dto/integration-config-response.dto';
import { UpsertIntegrationConfigDto } from './dto/upsert-integration-config.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { Request } from 'express';
import { buildAuditRequestContext } from '../audit-log/audit-request-context.util';

@ApiTags('Report Integrations')
@ApiBearerAuth('bearerAuth')
@Controller('report-integrations')
export class ReportIntegrationsController {
  constructor(
    private readonly service: ReportIntegrationsService,
  ) {}

  // ─── Admin: listar eventos de integração ──────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Listar eventos de integração (admin)' })
  @ApiResponse({ status: 200, type: [IntegrationEventResponseDto] })
  async findEvents(
    @Query() query: IntegrationEventQueryDto,
  ): Promise<ListResponseDto<IntegrationEventResponseDto>> {
    return this.service.findEvents(query);
  }

  // ─── Evento de integração por report ──────────────────────────

  @Get('by-report/:reportId')
  @ApiOperation({
    summary: 'Obter evento de integração por report',
    description:
      'Participante: só o dono do report; admin ou manager/content_manager do contexto também podem.',
  })
  @ApiParam({ name: 'reportId', type: Number })
  @ApiResponse({ status: 200, type: IntegrationEventResponseDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para este report' })
  async findByReport(
    @Param('reportId', ParseIntPipe) reportId: number,
    @CurrentUser() user: { userId: number },
  ): Promise<IntegrationEventResponseDto | null> {
    return this.service.findEventByReportId(reportId, user.userId);
  }

  @Get('by-participation/:participationId')
  @ApiOperation({
    summary:
      'Listar eventos de integração dos reports da minha participação (app)',
  })
  @ApiParam({ name: 'participationId', type: Number })
  @ApiResponse({ status: 200, type: [IntegrationEventResponseDto] })
  async findByParticipation(
    @Param('participationId', ParseIntPipe) participationId: number,
    @CurrentUser() user: { userId: number },
  ): Promise<IntegrationEventResponseDto[]> {
    return this.service.findEventsByParticipationForUser(
      participationId,
      user.userId,
    );
  }

  // ─── Admin: retry manual ──────────────────────────────────────

  @Post(':eventId/retry')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar evento de integração (retry)' })
  @ApiParam({ name: 'eventId', type: Number })
  @ApiResponse({ status: 200, type: IntegrationEventResponseDto })
  async retryIntegration(
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<IntegrationEventResponseDto> {
    return this.service.retryIntegration(eventId);
  }

  // ─── Mensagens do evento ──────────────────────────────────────

  @Get(':eventId/messages')
  @ApiOperation({
    summary: 'Buscar e sincronizar mensagens de um evento',
    description:
      'Mesmas regras de acesso que by-report: dono do report, admin ou gestor do contexto.',
  })
  @ApiParam({ name: 'eventId', type: Number })
  @ApiResponse({ status: 200, type: [IntegrationMessageResponseDto] })
  @ApiResponse({ status: 403, description: 'Sem permissão para este evento' })
  async getMessages(
    @Param('eventId', ParseIntPipe) eventId: number,
    @CurrentUser() user: { userId: number },
  ): Promise<IntegrationMessageResponseDto[]> {
    return this.service.syncMessages(eventId, user.userId);
  }

  @Post(':eventId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enviar mensagem para evento de integração',
    description:
      'Mesmas regras de acesso que by-report: dono do report, admin ou gestor do contexto.',
  })
  @ApiParam({ name: 'eventId', type: Number })
  @ApiResponse({ status: 201, type: IntegrationMessageResponseDto })
  @ApiResponse({ status: 403, description: 'Sem permissão para este evento' })
  async sendMessage(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: { userId: number },
  ): Promise<IntegrationMessageResponseDto> {
    return this.service.sendMessage(eventId, dto.message, user.userId);
  }

  // ─── Configuração de integração por contexto (admin) ─────────

  @Get('config/:contextId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Obter configuração de integração do contexto' })
  @ApiParam({ name: 'contextId', type: Number })
  @ApiResponse({ status: 200, type: IntegrationConfigResponseDto })
  async getConfig(
    @Param('contextId', ParseIntPipe) contextId: number,
  ): Promise<IntegrationConfigResponseDto | null> {
    return this.service.getConfigByContext(contextId);
  }

  @Put('config/:contextId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Criar/atualizar configuração de integração (versionada)' })
  @ApiParam({ name: 'contextId', type: Number })
  @ApiResponse({ status: 200, type: IntegrationConfigResponseDto })
  async upsertConfig(
    @Param('contextId', ParseIntPipe) contextId: number,
    @Body() dto: UpsertIntegrationConfigDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<IntegrationConfigResponseDto> {
    return this.service.upsertConfig(
      contextId,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }
}

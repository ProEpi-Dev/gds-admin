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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { MaintenanceWindowsService } from './maintenance-windows.service';
import {
  CreateMaintenanceWindowDto,
  MaintenanceWindowQueryDto,
  MaintenanceWindowResponseDto,
  UpdateMaintenanceWindowDto,
} from './dto/maintenance-window.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowDuringMaintenance } from '../common/decorators/allow-during-maintenance.decorator';
import { buildAuditRequestContext } from '../audit-log/audit-request-context.util';

/**
 * Liberado durante a manutenção: junto com o login, é a única porta de saída de
 * uma janela `full`. Sem isso, ligar o modo total trancaria todos os
 * administradores do lado de fora, sem como desligá-lo.
 *
 * O acesso segue restrito a admin pelo RolesGuard — `@AllowDuringMaintenance()`
 * apenas isenta do bloqueio por janela, não da autorização.
 */
@ApiTags('Maintenance windows')
@ApiBearerAuth('bearerAuth')
@AllowDuringMaintenance()
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('maintenance-windows')
export class MaintenanceWindowsController {
  constructor(private readonly service: MaintenanceWindowsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar janelas de indisponibilidade',
    description:
      'Ordenadas da mais recente para a mais antiga. `inEffect` indica qual está valendo agora.',
  })
  @ApiResponse({
    status: 200,
    type: ListResponseDto<MaintenanceWindowResponseDto>,
  })
  async findAll(
    @Query() query: MaintenanceWindowQueryDto,
  ): Promise<ListResponseDto<MaintenanceWindowResponseDto>> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar janela de indisponibilidade' })
  @ApiResponse({ status: 200, type: MaintenanceWindowResponseDto })
  @ApiResponse({ status: 404, description: 'Janela não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaintenanceWindowResponseDto> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Agendar janela de indisponibilidade',
    description:
      'Passa a valer assim que o período começar. Omitir `endsAt` para indisponibilidade sem previsão de retorno.',
  })
  @ApiResponse({ status: 201, type: MaintenanceWindowResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Período inválido ou dados incompletos',
  })
  async create(
    @Body() dto: CreateMaintenanceWindowDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<MaintenanceWindowResponseDto> {
    return this.service.create(dto, user.userId, buildAuditRequestContext(req));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Alterar janela de indisponibilidade',
    description:
      'Use `active: false` para encerrar uma janela em vigor sem apagar o registro.',
  })
  @ApiResponse({ status: 200, type: MaintenanceWindowResponseDto })
  @ApiResponse({ status: 400, description: 'Período inválido' })
  @ApiResponse({ status: 404, description: 'Janela não encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceWindowDto,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<MaintenanceWindowResponseDto> {
    return this.service.update(
      id,
      dto,
      user.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover janela de indisponibilidade' })
  @ApiResponse({ status: 204, description: 'Janela removida' })
  @ApiResponse({ status: 404, description: 'Janela não encontrada' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
    @Req() req: Request,
  ): Promise<void> {
    return this.service.remove(id, user.userId, buildAuditRequestContext(req));
  }
}

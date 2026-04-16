import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../authz/decorators/roles.decorator';
import { RolesGuard } from '../authz/guards/roles.guard';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

@ApiTags('AuditLogs')
@ApiBearerAuth('bearerAuth')
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar logs de auditoria',
    description: 'Retorna logs administrativos com filtros e paginação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de auditoria',
    type: ListResponseDto<AuditLogResponseDto>,
  })
  async findAll(
    @Query() query: AuditLogQueryDto,
  ): Promise<ListResponseDto<AuditLogResponseDto>> {
    return this.auditLogService.findAll(query);
  }
}

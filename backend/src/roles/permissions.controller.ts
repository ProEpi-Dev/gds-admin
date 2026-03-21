import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { PermissionResponseDto } from './dto/permission-response.dto';

@ApiTags('Permissions')
@ApiBearerAuth('bearerAuth')
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar permissões do sistema',
    description: 'Somente administrador global.',
  })
  @ApiResponse({ status: 200, type: [PermissionResponseDto] })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.rolesService.findAllPermissions();
  }
}

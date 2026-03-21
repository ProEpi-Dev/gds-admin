import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleResponseDto } from './dto/role-response.dto';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth('bearerAuth')
@UseGuards(RolesGuard)
@Roles('admin', 'manager')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar papéis',
    description: 'Retorna todos os papéis disponíveis. Admin e gerente podem listar (gerente precisa para atribuir papéis ao criar participações).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de papéis',
    type: [RoleResponseDto],
  })
  async findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id/permissions')
  @Roles('admin')
  @ApiOperation({
    summary: 'Permissões vinculadas ao papel',
    description: 'Somente administrador global.',
  })
  @ApiResponse({ status: 200, type: [PermissionResponseDto] })
  async getRolePermissions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PermissionResponseDto[]> {
    return this.rolesService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  @Roles('admin')
  @ApiOperation({
    summary: 'Definir permissões do papel',
    description:
      'Substitui todo o conjunto de permissões do papel. Somente administrador global.',
  })
  @ApiResponse({ status: 200, type: [PermissionResponseDto] })
  async setRolePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<PermissionResponseDto[]> {
    return this.rolesService.setRolePermissions(id, dto.permissionIds ?? []);
  }
}

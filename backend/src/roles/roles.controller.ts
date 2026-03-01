import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleResponseDto } from './dto/role-response.dto';
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
}

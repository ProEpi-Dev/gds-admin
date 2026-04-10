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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ParticipationsService } from './participations.service';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { UpdateParticipationDto } from './dto/update-participation.dto';
import { ParticipationQueryDto } from './dto/participation-query.dto';
import { ParticipationResponseDto } from './dto/participation-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleResponseDto } from '../roles/dto/role-response.dto';
import { ParticipationRoleBodyDto } from '../roles/dto/participation-role-body.dto';

@ApiTags('Participations')
@ApiBearerAuth('bearerAuth')
@UseGuards(RolesGuard)
@Roles('admin', 'manager', 'content_manager')
@Controller('participations')
export class ParticipationsController {
  constructor(private readonly participationsService: ParticipationsService) {}

  @Post()
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar participação',
    description: 'Cria uma nova participação de usuário em um contexto',
  })
  @ApiResponse({
    status: 201,
    description: 'Participação criada com sucesso',
    type: ParticipationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou entidades relacionadas não encontradas',
  })
  async create(
    @Body() createParticipationDto: CreateParticipationDto,
  ): Promise<ParticipationResponseDto> {
    return this.participationsService.create(createParticipationDto);
  }

  @Get()
  @Roles('admin', 'manager', 'content_manager', 'participant')
  @ApiOperation({
    summary: 'Listar participações',
    description:
      'Admin/manager/content_manager: participações dos contextos. Participant: apenas as próprias participações.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de participações',
    type: ListResponseDto<ParticipationResponseDto>,
  })
  async findAll(
    @Query() query: ParticipationQueryDto,
    @CurrentUser() user: any,
  ): Promise<ListResponseDto<ParticipationResponseDto>> {
    return this.participationsService.findAll(query, user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter participação por ID',
    description: 'Retorna detalhes de uma participação específica',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da participação',
    type: ParticipationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Participação não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ParticipationResponseDto> {
    return this.participationsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Atualizar participação',
    description: 'Atualiza uma participação existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiResponse({
    status: 200,
    description: 'Participação atualizada com sucesso',
    type: ParticipationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Participação não encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateParticipationDto: UpdateParticipationDto,
  ): Promise<ParticipationResponseDto> {
    return this.participationsService.update(id, updateParticipationDto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar participação',
    description:
      'Participação ativa: desativa. Participação inativa: exclui permanentemente do banco de dados.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiResponse({
    status: 204,
    description: 'Participação removida (desativada ou excluída permanentemente)',
  })
  @ApiResponse({
    status: 400,
    description:
      'Participação possui reports associados ou vínculos que impedem a exclusão permanente',
  })
  @ApiResponse({ status: 404, description: 'Participação não encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.participationsService.remove(id);
  }

  // ── Papéis da participação ──────────────────────────────────────────────

  @Get(':id/roles')
  @ApiOperation({
    summary: 'Listar papéis da participação',
    description: 'Retorna os papéis atribuídos a uma participação.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de papéis da participação',
    type: [RoleResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Participação não encontrada' })
  async findRoles(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RoleResponseDto[]> {
    return this.participationsService.findRoles(id);
  }

  @Post(':id/roles')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atribuir papel à participação',
    description: 'Adiciona um papel a uma participação. Apenas admin.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiResponse({
    status: 200,
    description: 'Papéis atualizados da participação',
    type: [RoleResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Participação ou papel não encontrado' })
  @ApiResponse({ status: 409, description: 'A participação já possui o papel' })
  async addRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ParticipationRoleBodyDto,
  ): Promise<RoleResponseDto[]> {
    return this.participationsService.addRole(id, body.roleId);
  }

  @Delete(':id/roles/:roleId')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover papel da participação',
    description: 'Remove um papel de uma participação. Apenas admin.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiParam({ name: 'roleId', type: Number, description: 'ID do papel' })
  @ApiResponse({
    status: 200,
    description: 'Papéis atualizados da participação',
    type: [RoleResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Participação ou papel não encontrado' })
  async removeRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<RoleResponseDto[]> {
    return this.participationsService.removeRole(id, roleId);
  }
}

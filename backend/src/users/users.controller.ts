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
  Req,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileStatusResponseDto } from './dto/profile-status-response.dto';
import { AcceptLegalDocumentsDto } from './dto/accept-legal-documents.dto';
import { LegalAcceptanceStatusResponseDto } from './dto/legal-acceptance-status-response.dto';
import { UserRoleResponseDto } from './dto/user-role-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Request } from 'express';
import { buildAuditRequestContext } from '../audit-log/audit-request-context.util';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar usuário',
    description:
      'Cria um novo usuário. Admin pode definir papel global; manager não pode.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email já está em uso' })
  async create(
    @CurrentUser() currentUser: { userId: number },
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto, currentUser.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'participant')
  @ApiOperation({
    summary: 'Listar usuários',
    description:
      'Admin: todos. Manager: usuários dos contextos que gerencia. Participant: apenas o próprio usuário quando search=seu email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários',
    type: ListResponseDto<UserResponseDto>,
  })
  async findAll(
    @CurrentUser() currentUser: { userId: number },
    @Query() query: UserQueryDto,
  ): Promise<ListResponseDto<UserResponseDto>> {
    return this.usersService.findAll(query, currentUser.userId);
  }

  @Get('admins')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar administradores',
    description:
      'Retorna apenas usuários com papel de administrador. Exclusivo para superadmin.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de administradores',
    type: ListResponseDto<UserResponseDto>,
  })
  async findAdmins(
    @Query() query: UserQueryDto,
  ): Promise<ListResponseDto<UserResponseDto>> {
    return this.usersService.findAdmins(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Obter usuário por ID',
    description:
      'Admin: qualquer usuário. Manager: apenas se o usuário participa de algum contexto que ele gerencia.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do usuário',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(
    @CurrentUser() currentUser: { userId: number },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id, currentUser.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'participant')
  @ApiOperation({
    summary: 'Atualizar usuário',
    description:
      'Admin: qualquer usuário e pode alterar papel global. Manager: apenas usuários que participam dos seus contextos; não pode alterar papel global. Participant: apenas o próprio perfil (name, email, password).',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Usuário atualizado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 409, description: 'Email já está em uso' })
  async update(
    @CurrentUser() currentUser: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.update(
      id,
      updateUserDto,
      currentUser.userId,
      buildAuditRequestContext(req),
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar usuário',
    description:
      'Admin: qualquer usuário. Manager: apenas usuários que participam dos seus contextos. Ativo: desativa; inativo: exclusão permanente se não houver dependências.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do usuário' })
  @ApiResponse({
    status: 204,
    description: 'Usuário removido (desativado ou excluído permanentemente)',
  })
  @ApiResponse({
    status: 400,
    description: 'Usuário inativo com vínculos que impedem exclusão permanente',
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async remove(
    @CurrentUser() currentUser: { userId: number },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.usersService.remove(id, currentUser.userId);
  }

  @Get('me/profile-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar status do perfil',
    description: 'Retorna o status de completude do perfil do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do perfil',
    type: ProfileStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado',
  })
  async getProfileStatus(
    @CurrentUser() user: any,
  ): Promise<ProfileStatusResponseDto> {
    return this.usersService.getProfileStatus(user.userId);
  }

  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar perfil',
    description: 'Atualiza dados do perfil do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil atualizado com sucesso',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado',
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  @Get('me/legal-acceptances/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar status de aceite de termos',
    description:
      'Retorna o status de aceite de documentos legais do usuário logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de aceite',
    type: LegalAcceptanceStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado',
  })
  async getLegalAcceptanceStatus(
    @CurrentUser() user: any,
  ): Promise<LegalAcceptanceStatusResponseDto> {
    return this.usersService.getLegalAcceptanceStatus(user.userId);
  }

  @Post('me/legal-acceptances')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Aceitar documentos legais',
    description: 'Registra o aceite de documentos legais pelo usuário logado',
  })
  @ApiResponse({
    status: 204,
    description: 'Documentos aceitos com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Documentos inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado',
  })
  async acceptLegalDocuments(
    @CurrentUser() user: any,
    @Body() acceptLegalDocumentsDto: AcceptLegalDocumentsDto,
    @Req() request: Request,
    @Headers('user-agent') userAgent?: string,
  ): Promise<void> {
    const ipAddress =
      request.ip ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress;

    return this.usersService.acceptLegalDocuments(
      user.userId,
      acceptLegalDocumentsDto,
      ipAddress,
      userAgent,
    );
  }

  @Get('me/role')
  @ApiOperation({
    summary: 'Obter papel do usuário',
    description:
      'Retorna informações sobre o papel do usuário logado (manager ou participante) e seus contextos',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações de papel do usuário',
    type: UserRoleResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Usuário não autenticado',
  })
  async getUserRole(@CurrentUser() user: any): Promise<UserRoleResponseDto> {
    return this.usersService.getUserRole(user.userId);
  }
}

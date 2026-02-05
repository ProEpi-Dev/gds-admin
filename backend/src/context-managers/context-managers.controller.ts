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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContextManagersService } from './context-managers.service';
import { CreateContextManagerDto } from './dto/create-context-manager.dto';
import { UpdateContextManagerDto } from './dto/update-context-manager.dto';
import { ContextManagerQueryDto } from './dto/context-manager-query.dto';
import { ContextManagerResponseDto } from './dto/context-manager-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Context Managers')
@ApiBearerAuth('bearerAuth')
@Controller('contexts/:contextId/managers')
export class ContextManagersController {
  constructor(
    private readonly contextManagersService: ContextManagersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar manager ao contexto',
    description: 'Adiciona um usuário como manager de um contexto',
  })
  @ApiParam({ name: 'contextId', type: Number, description: 'ID do contexto' })
  @ApiResponse({
    status: 201,
    description: 'Manager adicionado com sucesso',
    type: ContextManagerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou usuário não encontrado',
  })
  @ApiResponse({ status: 404, description: 'Contexto não encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Usuário já é manager deste contexto',
  })
  async create(
    @Param('contextId', ParseIntPipe) contextId: number,
    @Body() createContextManagerDto: CreateContextManagerDto,
  ): Promise<ContextManagerResponseDto> {
    return this.contextManagersService.create(
      contextId,
      createContextManagerDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar managers do contexto',
    description: 'Retorna lista paginada de managers de um contexto',
  })
  @ApiParam({ name: 'contextId', type: Number, description: 'ID do contexto' })
  @ApiResponse({
    status: 200,
    description: 'Lista de managers',
    type: ListResponseDto<ContextManagerResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'Contexto não encontrado' })
  async findAllByContext(
    @Param('contextId', ParseIntPipe) contextId: number,
    @Query() query: ContextManagerQueryDto,
  ): Promise<ListResponseDto<ContextManagerResponseDto>> {
    return this.contextManagersService.findAllByContext(contextId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter manager por ID',
    description: 'Retorna detalhes de um manager específico de um contexto',
  })
  @ApiParam({ name: 'contextId', type: Number, description: 'ID do contexto' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do context manager' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do manager',
    type: ContextManagerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Contexto ou manager não encontrado',
  })
  async findOne(
    @Param('contextId', ParseIntPipe) contextId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContextManagerResponseDto> {
    return this.contextManagersService.findOne(contextId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar manager',
    description: 'Atualiza um manager de contexto existente',
  })
  @ApiParam({ name: 'contextId', type: Number, description: 'ID do contexto' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do context manager' })
  @ApiResponse({
    status: 200,
    description: 'Manager atualizado com sucesso',
    type: ContextManagerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Contexto ou manager não encontrado',
  })
  async update(
    @Param('contextId', ParseIntPipe) contextId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContextManagerDto: UpdateContextManagerDto,
  ): Promise<ContextManagerResponseDto> {
    return this.contextManagersService.update(
      contextId,
      id,
      updateContextManagerDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover manager do contexto',
    description: 'Remove um manager de um contexto (soft delete - desativa)',
  })
  @ApiParam({ name: 'contextId', type: Number, description: 'ID do contexto' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do context manager' })
  @ApiResponse({ status: 204, description: 'Manager removido com sucesso' })
  @ApiResponse({
    status: 404,
    description: 'Contexto ou manager não encontrado',
  })
  async remove(
    @Param('contextId', ParseIntPipe) contextId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.contextManagersService.remove(contextId, id);
  }
}

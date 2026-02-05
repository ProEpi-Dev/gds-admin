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
import { ContextsService } from './contexts.service';
import { CreateContextDto } from './dto/create-context.dto';
import { UpdateContextDto } from './dto/update-context.dto';
import { ContextQueryDto } from './dto/context-query.dto';
import { ContextResponseDto } from './dto/context-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Contexts')
@ApiBearerAuth('bearerAuth')
@Controller('contexts')
export class ContextsController {
  constructor(private readonly contextsService: ContextsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar contexto',
    description: 'Cria um novo contexto no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Contexto criado com sucesso',
    type: ContextResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou localização não encontrada',
  })
  async create(
    @Body() createContextDto: CreateContextDto,
  ): Promise<ContextResponseDto> {
    return this.contextsService.create(createContextDto);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Listar contextos',
    description:
      'Retorna lista paginada de contextos com filtros opcionais. Endpoint público para permitir signup.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de contextos',
    type: ListResponseDto<ContextResponseDto>,
  })
  async findAll(
    @Query() query: ContextQueryDto,
  ): Promise<ListResponseDto<ContextResponseDto>> {
    return this.contextsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter contexto por ID',
    description: 'Retorna detalhes de um contexto específico',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do contexto' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do contexto',
    type: ContextResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contexto não encontrado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContextResponseDto> {
    return this.contextsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar contexto',
    description: 'Atualiza um contexto existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do contexto' })
  @ApiResponse({
    status: 200,
    description: 'Contexto atualizado com sucesso',
    type: ContextResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Contexto não encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContextDto: UpdateContextDto,
  ): Promise<ContextResponseDto> {
    return this.contextsService.update(id, updateContextDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar contexto',
    description:
      'Remove um contexto (soft delete - desativa). Não permite deletar se houver participações ou formulários associados.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do contexto' })
  @ApiResponse({ status: 204, description: 'Contexto deletado com sucesso' })
  @ApiResponse({ status: 400, description: 'Contexto possui relacionamentos' })
  @ApiResponse({ status: 404, description: 'Contexto não encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contextsService.remove(id);
  }
}

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
import { ContentQuizService } from './content-quiz.service';
import { CreateContentQuizDto } from './dto/create-content-quiz.dto';
import { UpdateContentQuizDto } from './dto/update-content-quiz.dto';
import { ContentQuizQueryDto } from './dto/content-quiz-query.dto';
import { ContentQuizResponseDto } from './dto/content-quiz-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Content-Quiz')
@ApiBearerAuth('bearerAuth')
@Controller('content-quiz')
export class ContentQuizController {
  constructor(private readonly contentQuizService: ContentQuizService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar associação conteúdo-quiz',
    description: 'Cria uma nova associação entre um conteúdo e um quiz',
  })
  @ApiResponse({
    status: 201,
    description: 'Associação criada com sucesso',
    type: ContentQuizResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou entidades relacionadas não encontradas',
  })
  async create(
    @Body() createContentQuizDto: CreateContentQuizDto,
  ): Promise<ContentQuizResponseDto> {
    return this.contentQuizService.create(createContentQuizDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar associações conteúdo-quiz',
    description: 'Retorna lista paginada de associações com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de associações',
    type: ListResponseDto<ContentQuizResponseDto>,
  })
  async findAll(
    @Query() query: ContentQuizQueryDto,
  ): Promise<ListResponseDto<ContentQuizResponseDto>> {
    return this.contentQuizService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter associação por ID',
    description: 'Retorna detalhes de uma associação específica',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da associação' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da associação',
    type: ContentQuizResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContentQuizResponseDto> {
    return this.contentQuizService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar associação',
    description: 'Atualiza uma associação existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da associação' })
  @ApiResponse({
    status: 200,
    description: 'Associação atualizada com sucesso',
    type: ContentQuizResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContentQuizDto: UpdateContentQuizDto,
  ): Promise<ContentQuizResponseDto> {
    return this.contentQuizService.update(id, updateContentQuizDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar associação',
    description: 'Remove uma associação (soft delete)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da associação' })
  @ApiResponse({ status: 204, description: 'Associação deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Associação não encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contentQuizService.remove(id);
  }
}


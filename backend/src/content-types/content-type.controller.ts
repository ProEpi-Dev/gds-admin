import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContentTypeService } from './content-type.service';
import { CreateContentTypeDto, UpdateContentTypeDto, ContentTypeResponseDto } from './content-type.dto';
import { RolesGuard } from '../authz/guards/roles.guard';
import { RequirePermission } from '../authz/decorators/require-permission.decorator';

@ApiTags('Content Types')
@Controller('content-types')
export class ContentTypeController {
  constructor(private readonly contentTypeService: ContentTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os tipos de conteúdo ativos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de conteúdo',
    type: [ContentTypeResponseDto],
  })
  async findAll() {
    return this.contentTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tipo de conteúdo por ID' })
  @ApiResponse({
    status: 200,
    description: 'Tipo de conteúdo encontrado',
    type: ContentTypeResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.contentTypeService.findOne(Number(id));
  }
}

// ==================== ADMIN ENDPOINTS ====================

@ApiTags('Content Types Admin')
@Controller('admin/content-types')
@UseGuards(RolesGuard)
@RequirePermission('content-type:manage')
export class ContentTypeAdminController {
  constructor(private readonly contentTypeService: ContentTypeService) {}

  @Get()
  @ApiOperation({
    summary: '[Admin] Listar todos os tipos de conteúdo (incluindo inativos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de tipos de conteúdo',
    type: [ContentTypeResponseDto],
  })
  async findAllAdmin() {
    return this.contentTypeService.findAllForAdmin();
  }

  @Post()
  @ApiOperation({
    summary: '[Admin] Criar novo tipo de conteúdo',
  })
  @ApiResponse({
    status: 201,
    description: 'Tipo de conteúdo criado com sucesso',
    type: ContentTypeResponseDto,
  })
  async create(@Body() dto: CreateContentTypeDto) {
    return this.contentTypeService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: '[Admin] Atualizar tipo de conteúdo',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de conteúdo atualizado',
    type: ContentTypeResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContentTypeDto,
  ) {
    return this.contentTypeService.update(Number(id), dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Admin] Deletar tipo de conteúdo (soft delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de conteúdo marcado como inativo',
  })
  async remove(@Param('id') id: string) {
    return this.contentTypeService.softDelete(Number(id));
  }
}

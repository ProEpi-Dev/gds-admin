import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LegalDocumentsService } from './legal-documents.service';
import { LegalDocumentResponseDto } from './dto/legal-document-response.dto';
import { LegalDocumentTypeResponseDto } from './dto/legal-document-type-response.dto';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { UpdateLegalDocumentDto } from './dto/update-legal-document.dto';
import { CreateLegalDocumentTypeDto } from './dto/create-legal-document-type.dto';
import { UpdateLegalDocumentTypeDto } from './dto/update-legal-document-type.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Legal Documents')
@Controller('legal-documents')
@Public()
export class LegalDocumentsController {
  constructor(private readonly legalDocumentsService: LegalDocumentsService) {}

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar documentos legais ativos',
    description:
      'Retorna todos os documentos legais ativos (última versão de cada tipo). Endpoint público.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos legais ativos',
    type: [LegalDocumentResponseDto],
  })
  async findActive(): Promise<LegalDocumentResponseDto[]> {
    return this.legalDocumentsService.findActive();
  }

  @Get('types')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar tipos de documentos legais',
    description: 'Retorna todos os tipos de documentos legais ativos. Endpoint público.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de documentos legais',
    type: [LegalDocumentTypeResponseDto],
  })
  async findAllTypes(): Promise<LegalDocumentTypeResponseDto[]> {
    return this.legalDocumentsService.findAllTypes();
  }

  @Get('type/:typeCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar documento por tipo',
    description:
      'Retorna o documento legal ativo de um tipo específico. Endpoint público.',
  })
  @ApiParam({
    name: 'typeCode',
    type: String,
    description: 'Código do tipo de documento',
    example: 'TERMS_OF_USE',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento legal encontrado',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado',
  })
  async findByTypeCode(
    @Param('typeCode') typeCode: string,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findByTypeCode(typeCode);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar documento por ID',
    description: 'Retorna um documento legal específico por ID. Endpoint público.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do documento legal',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento legal encontrado',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findOne(id);
  }
}

// ==================== ADMIN ENDPOINTS ====================

@ApiTags('Legal Documents Admin')
@Controller('admin/legal-documents')
@ApiBearerAuth()
export class LegalDocumentsAdminController {
  constructor(private readonly legalDocumentsService: LegalDocumentsService) {}

  // ========== DOCUMENT ENDPOINTS ==========

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Listar todos os documentos legais',
    description: 'Retorna todos os documentos legais (incluindo inativos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos legais',
    type: [LegalDocumentResponseDto],
  })
  async findAllDocuments(): Promise<LegalDocumentResponseDto[]> {
    return this.legalDocumentsService.findAllDocuments();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Buscar documento por ID',
    description: 'Retorna um documento legal específico por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do documento legal',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento legal encontrado',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado',
  })
  async findOneDocument(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[Admin] Criar documento legal',
    description: 'Cria um novo documento legal',
  })
  @ApiResponse({
    status: 201,
    description: 'Documento legal criado com sucesso',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo de documento não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito de versão',
  })
  async createDocument(
    @Body() dto: CreateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.createDocument(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Atualizar documento legal',
    description: 'Atualiza um documento legal existente',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do documento legal',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento legal atualizado com sucesso',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito de versão',
  })
  async updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.updateDocument(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '[Admin] Deletar documento legal',
    description: 'Remove um documento legal',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do documento legal',
  })
  @ApiResponse({
    status: 204,
    description: 'Documento legal deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Não é possível deletar documento com aceitações vinculadas',
  })
  async deleteDocument(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.legalDocumentsService.deleteDocument(id);
  }

  // ========== DOCUMENT TYPE ENDPOINTS ==========

  @Get('types/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Listar todos os tipos de documentos',
    description: 'Retorna todos os tipos de documentos legais (incluindo inativos)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de documentos legais',
    type: [LegalDocumentTypeResponseDto],
  })
  async findAllTypesAdmin(): Promise<LegalDocumentTypeResponseDto[]> {
    return this.legalDocumentsService.findAllTypesAdmin();
  }

  @Get('types/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Buscar tipo por ID',
    description: 'Retorna um tipo de documento específico por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do tipo de documento',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de documento encontrado',
    type: LegalDocumentTypeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo não encontrado',
  })
  async findOneType(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LegalDocumentTypeResponseDto> {
    return this.legalDocumentsService.findOneType(id);
  }

  @Post('types')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[Admin] Criar tipo de documento',
    description: 'Cria um novo tipo de documento legal',
  })
  @ApiResponse({
    status: 201,
    description: 'Tipo de documento criado com sucesso',
    type: LegalDocumentTypeResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Código já existe',
  })
  async createDocumentType(
    @Body() dto: CreateLegalDocumentTypeDto,
  ): Promise<LegalDocumentTypeResponseDto> {
    return this.legalDocumentsService.createDocumentType(dto);
  }

  @Put('types/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Atualizar tipo de documento',
    description: 'Atualiza um tipo de documento legal existente',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do tipo de documento',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipo de documento atualizado com sucesso',
    type: LegalDocumentTypeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo não encontrado',
  })
  async updateDocumentType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalDocumentTypeDto,
  ): Promise<LegalDocumentTypeResponseDto> {
    return this.legalDocumentsService.updateDocumentType(id, dto);
  }

  @Delete('types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '[Admin] Deletar tipo de documento',
    description: 'Remove um tipo de documento legal',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do tipo de documento',
  })
  @ApiResponse({
    status: 204,
    description: 'Tipo de documento deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Tipo não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Não é possível deletar tipo com documentos vinculados',
  })
  async deleteDocumentType(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.legalDocumentsService.deleteDocumentType(id);
  }
}

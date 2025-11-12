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
import { FormVersionsService } from './form-versions.service';
import { CreateFormVersionDto } from './dto/create-form-version.dto';
import { UpdateFormVersionDto } from './dto/update-form-version.dto';
import { FormVersionQueryDto } from './dto/form-version-query.dto';
import { FormVersionResponseDto } from './dto/form-version-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Form Versions')
@ApiBearerAuth('bearerAuth')
@Controller('forms/:formId/versions')
export class FormVersionsController {
  constructor(private readonly formVersionsService: FormVersionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar versão do formulário',
    description: 'Cria uma nova versão de um formulário',
  })
  @ApiParam({ name: 'formId', type: Number, description: 'ID do formulário' })
  @ApiResponse({
    status: 201,
    description: 'Versão criada com sucesso',
    type: FormVersionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Formulário não encontrado' })
  @ApiResponse({ status: 409, description: 'Versão com este número já existe' })
  async create(
    @Param('formId', ParseIntPipe) formId: number,
    @Body() createFormVersionDto: CreateFormVersionDto,
  ): Promise<FormVersionResponseDto> {
    return this.formVersionsService.create(formId, createFormVersionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar versões do formulário',
    description: 'Retorna lista paginada de versões de um formulário',
  })
  @ApiParam({ name: 'formId', type: Number, description: 'ID do formulário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de versões',
    type: ListResponseDto<FormVersionResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'Formulário não encontrado' })
  async findAllByForm(
    @Param('formId', ParseIntPipe) formId: number,
    @Query() query: FormVersionQueryDto,
  ): Promise<ListResponseDto<FormVersionResponseDto>> {
    return this.formVersionsService.findAllByForm(formId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter versão do formulário por ID',
    description: 'Retorna detalhes de uma versão específica de um formulário',
  })
  @ApiParam({ name: 'formId', type: Number, description: 'ID do formulário' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da versão do formulário' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da versão',
    type: FormVersionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Formulário ou versão não encontrado' })
  async findOne(
    @Param('formId', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FormVersionResponseDto> {
    return this.formVersionsService.findOne(formId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar versão do formulário',
    description: 'Atualiza uma versão de formulário existente',
  })
  @ApiParam({ name: 'formId', type: Number, description: 'ID do formulário' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da versão do formulário' })
  @ApiResponse({
    status: 200,
    description: 'Versão atualizada com sucesso',
    type: FormVersionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Formulário ou versão não encontrado' })
  @ApiResponse({ status: 409, description: 'Versão com este número já existe' })
  async update(
    @Param('formId', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFormVersionDto: UpdateFormVersionDto,
  ): Promise<FormVersionResponseDto> {
    return this.formVersionsService.update(formId, id, updateFormVersionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar versão do formulário',
    description: 'Remove uma versão de formulário (soft delete - desativa). Não permite deletar se houver reports associados.',
  })
  @ApiParam({ name: 'formId', type: Number, description: 'ID do formulário' })
  @ApiParam({ name: 'id', type: Number, description: 'ID da versão do formulário' })
  @ApiResponse({ status: 204, description: 'Versão deletada com sucesso' })
  @ApiResponse({ status: 400, description: 'Versão possui reports associados' })
  @ApiResponse({ status: 404, description: 'Formulário ou versão não encontrado' })
  async remove(
    @Param('formId', ParseIntPipe) formId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.formVersionsService.remove(formId, id);
  }
}


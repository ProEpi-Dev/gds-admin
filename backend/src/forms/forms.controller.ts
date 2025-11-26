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
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { FormQueryDto } from './dto/form-query.dto';
import { FormResponseDto } from './dto/form-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FormWithVersionDto } from './dto/form-with-version.dto';

@ApiTags('Forms')
@ApiBearerAuth('bearerAuth')
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar formulário',
    description: 'Cria um novo formulário no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Formulário criado com sucesso',
    type: FormResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou contexto não encontrado',
  })
  async create(
    @Body() createFormDto: CreateFormDto,
    @CurrentUser() user: any,
  ): Promise<FormResponseDto> {
    return this.formsService.create(createFormDto, user.userId);
  }

  @Get('with-latest-versions')
  @ApiOperation({
    summary: 'Listar formulários com últimas versões',
    description:
      'Retorna lista de formulários ativos com suas últimas versões ativas, formatado para uso em dropdowns',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de formulários com versões',
    type: [FormWithVersionDto],
  })
  async findFormsWithLatestVersions(
    @CurrentUser() user: any,
  ): Promise<FormWithVersionDto[]> {
    return this.formsService.findFormsWithLatestVersions(user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar formulários',
    description: 'Retorna lista paginada de formulários com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de formulários',
    type: ListResponseDto<FormResponseDto>,
  })
  async findAll(
    @Query() query: FormQueryDto,
    @CurrentUser() user: any,
  ): Promise<ListResponseDto<FormResponseDto>> {
    return this.formsService.findAll(query, user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter formulário por ID',
    description: 'Retorna detalhes de um formulário específico',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do formulário' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do formulário',
    type: FormResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Formulário não encontrado' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<FormResponseDto> {
    return this.formsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar formulário',
    description: 'Atualiza um formulário existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do formulário' })
  @ApiResponse({
    status: 200,
    description: 'Formulário atualizado com sucesso',
    type: FormResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Formulário não encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFormDto: UpdateFormDto,
    @CurrentUser() user: any,
  ): Promise<FormResponseDto> {
    return this.formsService.update(id, updateFormDto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar formulário',
    description:
      'Remove um formulário (soft delete - desativa). Deleta automaticamente todas as versões associadas antes de deletar o formulário. Não permite deletar se alguma versão possuir reports associados.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do formulário' })
  @ApiResponse({ status: 204, description: 'Formulário deletado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Alguma versão do formulário possui reports associados',
  })
  @ApiResponse({ status: 404, description: 'Formulário não encontrado' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.formsService.remove(id, user.userId);
  }
}

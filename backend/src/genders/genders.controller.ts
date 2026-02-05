import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GendersService } from './genders.service';
import { GenderResponseDto } from './dto/gender-response.dto';
import { CreateGenderDto } from './dto/create-gender.dto';
import { UpdateGenderDto } from './dto/update-gender.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Genders')
@Controller('genders')
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar gêneros',
    description:
      'Retorna todos os gêneros ativos disponíveis para seleção. Endpoint público para uso em formulários.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filtrar apenas gêneros ativos (padrão: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de gêneros',
    type: [GenderResponseDto],
  })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<GenderResponseDto[]> {
    const activeOnlyBool =
      activeOnly === undefined ? true : activeOnly === 'true';
    return this.gendersService.findAll(activeOnlyBool);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar gênero por ID',
    description: 'Retorna um gênero específico pelo ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do gênero',
  })
  @ApiResponse({
    status: 200,
    description: 'Gênero encontrado',
    type: GenderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Gênero não encontrado',
  })
  async findOne(@Param('id') id: string): Promise<GenderResponseDto> {
    return this.gendersService.findOne(Number(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar novo gênero',
    description: 'Cria um novo gênero no sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Gênero criado com sucesso',
    type: GenderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou gênero já existe',
  })
  async create(@Body() dto: CreateGenderDto): Promise<GenderResponseDto> {
    return this.gendersService.create(dto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar gênero',
    description: 'Atualiza um gênero existente.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do gênero',
  })
  @ApiResponse({
    status: 200,
    description: 'Gênero atualizado com sucesso',
    type: GenderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Gênero não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou nome já existe',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGenderDto,
  ): Promise<GenderResponseDto> {
    return this.gendersService.update(Number(id), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar gênero',
    description:
      'Remove um gênero do sistema. Não permite deletar se houver usuários associados.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID do gênero',
  })
  @ApiResponse({
    status: 204,
    description: 'Gênero deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Gênero não encontrado',
  })
  @ApiResponse({
    status: 400,
    description: 'Não é possível deletar gênero com usuários associados',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.gendersService.remove(Number(id));
  }
}

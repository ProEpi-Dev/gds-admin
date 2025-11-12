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
import { ParticipationsService } from './participations.service';
import { CreateParticipationDto } from './dto/create-participation.dto';
import { UpdateParticipationDto } from './dto/update-participation.dto';
import { ParticipationQueryDto } from './dto/participation-query.dto';
import { ParticipationResponseDto } from './dto/participation-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Participations')
@ApiBearerAuth('bearerAuth')
@Controller('participations')
export class ParticipationsController {
  constructor(private readonly participationsService: ParticipationsService) {}

  @Post()
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
  @ApiResponse({ status: 400, description: 'Dados inválidos ou entidades relacionadas não encontradas' })
  async create(
    @Body() createParticipationDto: CreateParticipationDto,
  ): Promise<ParticipationResponseDto> {
    return this.participationsService.create(createParticipationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar participações',
    description: 'Retorna lista paginada de participações com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de participações',
    type: ListResponseDto<ParticipationResponseDto>,
  })
  async findAll(
    @Query() query: ParticipationQueryDto,
  ): Promise<ListResponseDto<ParticipationResponseDto>> {
    return this.participationsService.findAll(query);
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar participação',
    description: 'Remove uma participação (soft delete - desativa). Não permite deletar se houver reports associados.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da participação' })
  @ApiResponse({ status: 204, description: 'Participação deletada com sucesso' })
  @ApiResponse({ status: 400, description: 'Participação possui reports associados' })
  @ApiResponse({ status: 404, description: 'Participação não encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.participationsService.remove(id);
  }
}


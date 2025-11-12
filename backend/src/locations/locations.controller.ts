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
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { ListResponseDto } from '../common/dto/list-response.dto';

@ApiTags('Locations')
@ApiBearerAuth('bearerAuth')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar localização',
    description: 'Cria uma nova localização no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Localização criada com sucesso',
    type: LocationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou localização pai não encontrada' })
  async create(@Body() createLocationDto: CreateLocationDto): Promise<LocationResponseDto> {
    return this.locationsService.create(createLocationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar localizações',
    description: 'Retorna lista paginada de localizações com filtros opcionais',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de localizações',
    type: ListResponseDto<LocationResponseDto>,
  })
  async findAll(
    @Query() query: LocationQueryDto,
  ): Promise<ListResponseDto<LocationResponseDto>> {
    return this.locationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter localização por ID',
    description: 'Retorna detalhes de uma localização específica',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da localização' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da localização',
    type: LocationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Localização não encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<LocationResponseDto> {
    return this.locationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar localização',
    description: 'Atualiza uma localização existente',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da localização' })
  @ApiResponse({
    status: 200,
    description: 'Localização atualizada com sucesso',
    type: LocationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Localização não encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar localização',
    description: 'Remove uma localização (soft delete - desativa). Não permite deletar se houver localizações filhas.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da localização' })
  @ApiResponse({ status: 204, description: 'Localização deletada com sucesso' })
  @ApiResponse({ status: 400, description: 'Localização possui filhos' })
  @ApiResponse({ status: 404, description: 'Localização não encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.locationsService.remove(id);
  }
}


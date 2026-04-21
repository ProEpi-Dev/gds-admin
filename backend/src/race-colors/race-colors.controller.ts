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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { RaceColorsService } from './race-colors.service';
import { RaceColorResponseDto } from './dto/race-color-response.dto';
import { CreateRaceColorDto } from './dto/create-race-color.dto';
import { UpdateRaceColorDto } from './dto/update-race-color.dto';

@ApiTags('Race Colors')
@ApiBearerAuth('bearerAuth')
@Controller('race-colors')
export class RaceColorsController {
  constructor(private readonly raceColorsService: RaceColorsService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar raças/cores',
    description:
      'Retorna todas as raças/cores ativas disponíveis para seleção. Endpoint público para formulários.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'Filtrar apenas registros ativos (padrão: true)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de raças/cores',
    type: [RaceColorResponseDto],
  })
  async findAll(
    @Query('activeOnly') activeOnly?: string,
  ): Promise<RaceColorResponseDto[]> {
    const activeOnlyBool =
      activeOnly === undefined ? true : activeOnly === 'true';
    return this.raceColorsService.findAll(activeOnlyBool);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar raça/cor por ID',
    description: 'Retorna uma raça/cor específica pelo ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID da raça/cor',
  })
  @ApiResponse({
    status: 200,
    description: 'Raça/cor encontrada',
    type: RaceColorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Raça/cor não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<RaceColorResponseDto> {
    return this.raceColorsService.findOne(Number(id));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar nova raça/cor',
    description: 'Cria uma nova raça/cor no sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Raça/cor criada com sucesso',
    type: RaceColorResponseDto,
  })
  async create(@Body() dto: CreateRaceColorDto): Promise<RaceColorResponseDto> {
    return this.raceColorsService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar raça/cor',
    description: 'Atualiza uma raça/cor existente.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID da raça/cor',
  })
  @ApiResponse({
    status: 200,
    description: 'Raça/cor atualizada com sucesso',
    type: RaceColorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRaceColorDto,
  ): Promise<RaceColorResponseDto> {
    return this.raceColorsService.update(Number(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar raça/cor',
    description:
      'Remove uma raça/cor do sistema. Não permite deletar se houver usuários associados.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID da raça/cor',
  })
  @ApiResponse({ status: 204, description: 'Raça/cor deletada com sucesso' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.raceColorsService.remove(Number(id));
  }
}

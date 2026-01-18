import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GendersService } from './genders.service';
import { GenderResponseDto } from './dto/gender-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Genders')
@Controller('genders')
@Public()
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar gêneros',
    description:
      'Retorna todos os gêneros ativos disponíveis para seleção. Endpoint público.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de gêneros',
    type: [GenderResponseDto],
  })
  async findAll(): Promise<GenderResponseDto[]> {
    return this.gendersService.findAll();
  }
}

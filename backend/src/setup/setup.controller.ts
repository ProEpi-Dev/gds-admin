import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { SetupDto } from './dto/setup.dto';
import { SetupResponseDto } from './dto/setup-response.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inicializar sistema',
    description:
      'Cria um contexto padrão e um manager default para o sistema. Só pode ser executado uma vez.',
  })
  @ApiBody({ type: SetupDto })
  @ApiResponse({
    status: 201,
    description: 'Sistema inicializado com sucesso',
    type: SetupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Sistema já foi inicializado ou dados inválidos',
  })
  async setup(@Body() setupDto: SetupDto): Promise<SetupResponseDto> {
    return this.setupService.setup(setupDto);
  }
}

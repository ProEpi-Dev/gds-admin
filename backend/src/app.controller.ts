import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Verifica o status da aplicação e conexão com o banco de dados',
  })
  @ApiResponse({
    status: 200,
    description: 'Aplicação está funcionando corretamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        database: { type: 'string', example: 'connected' },
        uptime: { type: 'number', example: 12345 },
      },
    },
  })
  async getHealth() {
    return this.appService.getHealth();
  }
}

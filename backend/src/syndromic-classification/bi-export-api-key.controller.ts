import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../authz/decorators/roles.decorator';
import { RolesGuard } from '../authz/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateBiExportApiKeyDto,
  CreateBiExportApiKeyResponseDto,
  ListBiExportApiKeysQueryDto,
  BiExportApiKeyListItemDto,
} from './dto/bi-export-api-key.dto';
import { BiExportApiKeyService } from './bi-export-api-key.service';

@ApiTags('SyndromicClassification')
@ApiBearerAuth('bearerAuth')
@Controller('syndromic-classification/bi-export-api-keys')
@UseGuards(RolesGuard)
@Roles('admin', 'manager')
export class BiExportApiKeyController {
  constructor(private readonly service: BiExportApiKeyService) {}

  @Get()
  @ApiOperation({ summary: 'Listar chaves de API de exportação (BI) por contexto' })
  @ApiResponse({ status: 200, type: [BiExportApiKeyListItemDto] })
  async list(
    @Query() query: ListBiExportApiKeysQueryDto,
    @CurrentUser() user: { userId: number },
  ): Promise<BiExportApiKeyListItemDto[]> {
    return this.service.listForContext(query.contextId, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar chave de API (segredo exibido apenas nesta resposta)' })
  @ApiResponse({ status: 201, type: CreateBiExportApiKeyResponseDto })
  async create(
    @Body() dto: CreateBiExportApiKeyDto,
    @CurrentUser() user: { userId: number },
  ): Promise<CreateBiExportApiKeyResponseDto> {
    return this.service.create(dto, user.userId);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar chave de API' })
  @ApiParam({ name: 'publicId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Revogada ou já estava revogada' })
  async revoke(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @CurrentUser() user: { userId: number },
  ): Promise<void> {
    await this.service.revoke(publicId, user.userId);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';
import { RequirePermission } from '../authz/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Contents')
@ApiBearerAuth()
@Controller('contents')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(RolesGuard)
  @RequirePermission('content:write')
  @ApiOperation({ summary: 'Criar conteúdo (manager, content_manager ou admin)' })
  create(@Body() data: any) {
    return this.contentService.create(data);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager', 'participant')
  @ApiOperation({ summary: 'Listar conteúdos do contexto (admin/manager/content_manager/participant)' })
  list(
    @Query('contextId') contextId: string | undefined,
    @CurrentUser() user: any,
  ) {
    const id = contextId ? Number(contextId) : undefined;
    return this.contentService.list(Number.isNaN(id) ? undefined : id, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar conteúdo por ID' })
  get(@Param('id') id: string) {
    return this.contentService.get(Number(id));
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @RequirePermission('content:write')
  @ApiOperation({ summary: 'Atualizar conteúdo (manager, content_manager ou admin)' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.contentService.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @RequirePermission('content:write')
  @ApiOperation({ summary: 'Remover conteúdo (manager, content_manager ou admin)' })
  delete(@Param('id') id: string) {
    return this.contentService.delete(Number(id));
  }
}

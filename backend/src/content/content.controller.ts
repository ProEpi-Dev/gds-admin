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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Listar conteúdos do contexto (admin/manager/content_manager/participant)',
    description:
      'Por padrão retorna só ativos. Com includeInactive=true, quem tem content:write também vê inativos (exclusão lógica).',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    description: 'true para incluir conteúdos inativos (requer permissão content:write)',
  })
  list(
    @Query('contextId') contextId: string | undefined,
    @Query('includeInactive') includeInactive: string | undefined,
    @CurrentUser() user: any,
  ) {
    const id = contextId ? Number(contextId) : undefined;
    const wantInactive =
      includeInactive === 'true' || includeInactive === '1';
    return this.contentService.list(
      Number.isNaN(id) ? undefined : id,
      user.userId,
      wantInactive ? { includeInactive: true } : undefined,
    );
  }

  @Post(':id/reactivate')
  @UseGuards(RolesGuard)
  @RequirePermission('content:write')
  @ApiOperation({
    summary: 'Reativar conteúdo',
    description: 'Define active=true e publica novamente se não houver published_at.',
  })
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.contentService.reactivate(Number(id), user.userId);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @RequirePermission('content:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir conteúdo permanentemente',
    description:
      'Remove o registro do banco. Só para conteúdos já inativos, sem vínculo em trilhas (sequence) nem em quizzes (content_quiz).',
  })
  permanentDelete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.contentService.permanentDelete(Number(id), user.userId);
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
  @ApiOperation({
    summary: 'Desativar conteúdo (exclusão lógica)',
    description:
      'Define active=false. Exige que não haja vínculo em trilhas (sequence) nem quizzes (content_quiz).',
  })
  delete(@Param('id') id: string) {
    return this.contentService.delete(Number(id));
  }
}

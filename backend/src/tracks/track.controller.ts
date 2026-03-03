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
import { TrackService } from './track.service';
import { TrackQueryDto } from './dto/track-query.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';

@ApiTags('Tracks')
@Controller('tracks')
@ApiBearerAuth()
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Criar nova trilha',
    description:
      'Cria uma nova trilha. O context_id é opcional - se não fornecido, será inferido automaticamente do usuário logado (se gerenciar apenas 1 contexto)',
  })
  create(@Body() data: CreateTrackDto, @CurrentUser() user: any) {
    return this.trackService.create(data, user);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  @ApiOperation({ summary: 'Listar trilhas', description: 'Lista trilhas filtradas pelo contexto do usuário' })
  list(@Query() query: TrackQueryDto, @CurrentUser() user: any) {
    return this.trackService.list(query, user.userId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  @ApiOperation({ summary: 'Obter trilha por ID' })
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trackService.get(Number(id), user.userId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Atualizar trilha',
    description: 'Atualiza os dados de uma trilha existente',
  })
  update(
    @Param('id') id: string,
    @Body() data: CreateTrackDto,
    @CurrentUser() user: any,
  ) {
    return this.trackService.update(Number(id), data, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.trackService.delete(Number(id), user.userId);
  }

  @Post(':trackId/sections/:sectionId/content/:contentId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  addContentToSection(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: any,
  ) {
    return this.trackService.addContentToSection(
      Number(trackId),
      Number(sectionId),
      Number(contentId),
      user.userId,
    );
  }

  @Post(':trackId/sections/:sectionId/form/:formId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  addFormToSection(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: any,
  ) {
    return this.trackService.addFormToSection(
      Number(trackId),
      Number(sectionId),
      Number(formId),
      user.userId,
    );
  }

  @Delete(':trackId/sections/:sectionId/content/:contentId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  removeContentFromSection(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: any,
  ) {
    return this.trackService.removeContentFromSection(
      Number(trackId),
      Number(sectionId),
      Number(contentId),
      user.userId,
    );
  }

  @Put(':trackId/sections/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  reorderSections(
    @Param('trackId') trackId: string,
    @Body() data: { sections: Array<{ id: number; order: number }> },
    @CurrentUser() user: any,
  ) {
    return this.trackService.reorderSections(Number(trackId), data.sections, user.userId);
  }

  @Delete(':trackId/sections/:sectionId/sequences/:sequenceId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  removeSequence(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('sequenceId') sequenceId: string,
    @CurrentUser() user: any,
  ) {
    return this.trackService.removeSequence(
      Number(trackId),
      Number(sectionId),
      Number(sequenceId),
      user.userId,
    );
  }

  @Put(':trackId/sections/:sectionId/sequences/reorder')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  reorderSequences(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Body() data: { sequences: Array<{ id: number; order: number }> },
    @CurrentUser() user: any,
  ) {
    return this.trackService.reorderSequences(
      Number(trackId),
      Number(sectionId),
      data.sequences,
      user.userId,
    );
  }
}

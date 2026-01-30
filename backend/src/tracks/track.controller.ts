import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrackService } from './track.service';
import { TrackQueryDto } from './dto/track-query.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Tracks')
@Controller('tracks')
@ApiBearerAuth()
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar nova trilha',
    description:
      'Cria uma nova trilha. O context_id é opcional - se não fornecido, será inferido automaticamente do usuário logado (se gerenciar apenas 1 contexto)',
  })
  create(@Body() data: CreateTrackDto, @CurrentUser() user: any) {
    return this.trackService.create(data, user);
  }

  @Get()
  list(@Query() query: TrackQueryDto) {
    return this.trackService.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.trackService.get(Number(id));
  }

  @Put(':id')
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
  delete(@Param('id') id: string) {
    return this.trackService.delete(Number(id));
  }

  @Post(':trackId/sections/:sectionId/content/:contentId')
  addContentToSection(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.trackService.addContentToSection(
      Number(trackId),
      Number(sectionId),
      Number(contentId),
    );
  }

  @Post(':trackId/sections/:sectionId/form/:formId')
  addFormToSection(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('formId') formId: string,
  ) {
    return this.trackService.addFormToSection(
      Number(trackId),
      Number(sectionId),
      Number(formId),
    );
  }

  @Delete(':trackId/sections/:sectionId/content/:contentId')
  removeContentFromSection(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('contentId') contentId: string,
  ) {
    return this.trackService.removeContentFromSection(
      Number(trackId),
      Number(sectionId),
      Number(contentId),
    );
  }

  @Put(':trackId/sections/reorder')
  reorderSections(
    @Param('trackId') trackId: string,
    @Body() data: { sections: Array<{ id: number; order: number }> },
  ) {
    return this.trackService.reorderSections(Number(trackId), data.sections);
  }

  @Delete(':trackId/sections/:sectionId/sequences/:sequenceId')
  removeSequence(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Param('sequenceId') sequenceId: string,
  ) {
    return this.trackService.removeSequence(
      Number(trackId),
      Number(sectionId),
      Number(sequenceId),
    );
  }

  @Put(':trackId/sections/:sectionId/sequences/reorder')
  reorderSequences(
    @Param('trackId') trackId: string,
    @Param('sectionId') sectionId: string,
    @Body() data: { sequences: Array<{ id: number; order: number }> },
  ) {
    return this.trackService.reorderSequences(
      Number(trackId),
      Number(sectionId),
      data.sequences,
    );
  }
}

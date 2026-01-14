import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { TrackService } from './track.service';

@Controller('tracks')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Post()
  create(@Body() data: any) {
    return this.trackService.create(data);
  }

  @Get()
  list() {
    return this.trackService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.trackService.get(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.trackService.update(Number(id), data);
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

  @Put(':trackId/sections/reorder')
  reorderSections(
    @Param('trackId') trackId: string,
    @Body() data: { sections: Array<{ id: number; order: number }> },
  ) {
    return this.trackService.reorderSections(Number(trackId), data.sections);
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

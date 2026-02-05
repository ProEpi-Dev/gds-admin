import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('contents')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  create(@Body() data: any) {
    return this.contentService.create(data);
  }

  @Get()
  list() {
    return this.contentService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.contentService.get(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.contentService.update(Number(id), data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.contentService.delete(Number(id));
  }
}

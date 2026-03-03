import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto } from './tag.dto';
import { RolesGuard } from '../authz/guards/roles.guard';
import { Roles } from '../authz/decorators/roles.decorator';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  findAll() {
    return this.tagService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tagService.findOne(Number(id));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  create(@Body() dto: CreateTagDto) {
    return this.tagService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagService.update(Number(id), dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'content_manager')
  remove(@Param('id') id: string) {
    return this.tagService.remove(Number(id));
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { PaginationLinksDto } from './pagination.dto';
import { PaginationMetaDto } from './pagination.dto';

export class ListResponseDto<T> {
  @ApiProperty({ description: 'Lista de itens', isArray: true })
  data: T[];

  @ApiProperty({ description: 'Metadados de paginação', type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ description: 'Links de paginação', type: PaginationLinksDto })
  links: PaginationLinksDto;
}


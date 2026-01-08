import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class ContentQuizQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID do conteúdo',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  contentId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do formulário (quiz)',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  formId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por status ativo',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}


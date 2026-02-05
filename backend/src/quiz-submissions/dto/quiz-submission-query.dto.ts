import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QuizSubmissionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID da participação',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  participationId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da versão do formulário',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  formVersionId?: number;

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

  @ApiPropertyOptional({
    description: 'Filtrar por aprovação',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isPassed?: boolean;

  @ApiPropertyOptional({
    description: 'Data inicial para filtrar submissões (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtrar submissões (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class IntegrationEventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['pending', 'processing', 'sent', 'failed'],
  })
  @IsOptional()
  @IsEnum(['pending', 'processing', 'sent', 'failed'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  contextId?: number;
}

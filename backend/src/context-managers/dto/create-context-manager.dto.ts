import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContextManagerDto {
  @ApiProperty({
    description: 'ID do usuário que será manager',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({
    description: 'Status ativo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

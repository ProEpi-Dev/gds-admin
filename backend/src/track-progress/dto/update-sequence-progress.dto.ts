import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt } from 'class-validator';
import { progress_status_enum } from '@prisma/client';

export class UpdateSequenceProgressDto {
  @ApiProperty({
    description: 'Status da sequência',
    enum: progress_status_enum,
    example: progress_status_enum.in_progress,
    required: false,
  })
  @IsEnum(progress_status_enum)
  @IsOptional()
  status?: progress_status_enum;

  @ApiProperty({
    description: 'Tempo gasto na sequência em segundos',
    example: 120,
    required: false,
  })
  @IsInt()
  @IsOptional()
  timeSpentSeconds?: number;
}

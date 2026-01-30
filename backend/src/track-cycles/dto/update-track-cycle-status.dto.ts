import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { track_cycle_status_enum } from '@prisma/client';

export class UpdateTrackCycleStatusDto {
  @ApiProperty({
    description: 'Novo status do ciclo',
    enum: track_cycle_status_enum,
    example: track_cycle_status_enum.active,
  })
  @IsEnum(track_cycle_status_enum)
  @IsNotEmpty()
  status: track_cycle_status_enum;
}

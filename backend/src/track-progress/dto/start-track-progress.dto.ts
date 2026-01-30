import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class StartTrackProgressDto {
  @ApiProperty({
    description: 'ID do ciclo da trilha',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  trackCycleId: number;

  @ApiProperty({
    description: 'ID da participação do usuário',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  participationId: number;
}

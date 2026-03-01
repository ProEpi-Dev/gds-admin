import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class ParticipationRoleBodyDto {
  @ApiProperty({ description: 'ID do papel a atribuir', example: 2 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  roleId: number;
}

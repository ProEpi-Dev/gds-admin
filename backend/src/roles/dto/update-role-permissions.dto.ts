import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'IDs das permissões ativas para o papel (substitui o conjunto anterior)',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  permissionIds: number[];
}

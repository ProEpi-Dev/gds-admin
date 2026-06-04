import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';

export class MergeDuplicateUsersDto {
  @ApiProperty({
    description: 'ID do usuário canônico (principal) que permanecerá após o merge',
    example: 42570,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  canonicalUserId: number;

  @ApiProperty({
    description: 'IDs dos usuários duplicados que serão mesclados e removidos',
    example: [1182],
    type: [Number],
  })
  @Type(() => Number)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  duplicateUserIds: number[];

  @ApiPropertyOptional({
    description:
      'Email final do usuário canônico (ex.: normalizar caixa). Se omitido, mantém o email atual.',
    example: 'joao@example.com',
  })
  @IsEmail()
  @IsOptional()
  canonicalEmail?: string;

  @ApiPropertyOptional({
    description:
      'Se true, apenas valida e retorna estatísticas pré-merge sem executar a stored procedure.',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;
}

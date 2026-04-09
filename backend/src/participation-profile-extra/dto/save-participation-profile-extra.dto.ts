import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveParticipationProfileExtraDto {
  @ApiProperty({ description: 'ID da versão ativa do formulário profile_extra' })
  @Type(() => Number)
  @IsInt()
  formVersionId: number;

  @ApiProperty({
    description: 'Respostas dos campos (chave = name do campo na definição)',
    example: { campo1: 'valor' },
  })
  @IsObject()
  formResponse: Record<string, unknown>;
}

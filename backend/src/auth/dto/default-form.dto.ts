import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormVersionResponseDto } from '../../form-versions/dto/form-version-response.dto';

export class DefaultFormDto {
  @ApiProperty({ description: 'ID do formulário', example: 1 })
  formId: number;

  @ApiProperty({ description: 'Título do formulário', example: 'Formulário de Sinal' })
  formTitle: string;

  @ApiPropertyOptional({ description: 'Referência do formulário', example: 'DEFAULT_SIGNAL_FORM' })
  formReference: string | null;

  @ApiProperty({
    description: 'Versão ativa mais recente do formulário',
    type: FormVersionResponseDto,
    nullable: true,
  })
  version: FormVersionResponseDto | null;
}






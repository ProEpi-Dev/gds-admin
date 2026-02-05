import { ApiProperty } from '@nestjs/swagger';
import { FormVersionResponseDto } from '../../form-versions/dto/form-version-response.dto';

export class FormWithVersionDto {
  @ApiProperty({ description: 'ID do formulário', example: 1 })
  formId: number;

  @ApiProperty({
    description: 'Título do formulário',
    example: 'Formulário de Vigilância',
  })
  formTitle: string;

  @ApiProperty({
    description: 'Última versão do formulário',
    type: FormVersionResponseDto,
  })
  version: FormVersionResponseDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsNumber } from 'class-validator';

export class AcceptLegalDocumentsDto {
  @ApiProperty({
    description: 'IDs dos documentos legais a serem aceitos',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  legalDocumentIds: number[];
}

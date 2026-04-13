import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Conteúdo da mensagem a ser enviada' })
  @IsNotEmpty()
  @IsString()
  message: string;
}

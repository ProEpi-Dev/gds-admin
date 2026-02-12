import { IsString, IsOptional } from 'class-validator';

export class CreateContentTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateContentTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  active?: boolean;
}

export class ContentTypeResponseDto {
  id: number;
  name: string;
  description?: string;
  color?: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

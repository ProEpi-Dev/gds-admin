export interface ContentType {
  id: number;
  name: string;
  description?: string;
  color?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContentTypeDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateContentTypeDto {
  name?: string;
  description?: string;
  color?: string;
  active?: boolean;
}

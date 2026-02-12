export interface ContentType {
  id: number;
  name: string;
  color?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContentTypeDto {
  name: string;
  color?: string;
}

export interface UpdateContentTypeDto {
  name?: string;
  color?: string;
  active?: boolean;
}

export interface Gender {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenderDto {
  name: string;
}

export interface UpdateGenderDto {
  name?: string;
  active?: boolean;
}

export interface GenderQuery {
  activeOnly?: boolean;
}

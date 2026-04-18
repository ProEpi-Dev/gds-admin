export interface RaceColor {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRaceColorDto {
  name: string;
}

export interface UpdateRaceColorDto {
  name?: string;
  active?: boolean;
}

export interface RaceColorQuery {
  activeOnly?: boolean;
}

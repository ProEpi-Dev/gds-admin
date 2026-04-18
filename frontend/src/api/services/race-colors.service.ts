import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type {
  CreateRaceColorDto,
  RaceColor,
  RaceColorQuery,
  UpdateRaceColorDto,
} from "../../types/race-color.types";

export const raceColorsService = {
  async findAll(query?: RaceColorQuery): Promise<RaceColor[]> {
    const params = new URLSearchParams();
    if (query?.activeOnly !== undefined) {
      params.append("activeOnly", query.activeOnly.toString());
    }
    const url = params.toString()
      ? `${API_ENDPOINTS.RACE_COLORS.LIST}?${params.toString()}`
      : API_ENDPOINTS.RACE_COLORS.LIST;

    const response = await apiClient.get(url);
    return response.data;
  },

  async findOne(id: number): Promise<RaceColor> {
    const response = await apiClient.get(API_ENDPOINTS.RACE_COLORS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateRaceColorDto): Promise<RaceColor> {
    const response = await apiClient.post(
      API_ENDPOINTS.RACE_COLORS.CREATE,
      data,
    );
    return response.data;
  },

  async update(id: number, data: UpdateRaceColorDto): Promise<RaceColor> {
    const response = await apiClient.put(
      API_ENDPOINTS.RACE_COLORS.UPDATE(id),
      data,
    );
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.RACE_COLORS.DELETE(id));
  },
};

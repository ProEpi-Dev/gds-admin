import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type {
  Gender,
  CreateGenderDto,
  UpdateGenderDto,
  GenderQuery,
} from "../../types/gender.types";

export const gendersService = {
  async findAll(query?: GenderQuery): Promise<Gender[]> {
    const params = new URLSearchParams();
    if (query?.activeOnly !== undefined) {
      params.append("activeOnly", query.activeOnly.toString());
    }
    const url = params.toString()
      ? `${API_ENDPOINTS.GENDERS.LIST}?${params.toString()}`
      : API_ENDPOINTS.GENDERS.LIST;
    const response = await apiClient.get(url);
    return response.data;
  },

  async findOne(id: number): Promise<Gender> {
    const response = await apiClient.get(API_ENDPOINTS.GENDERS.DETAIL(id));
    return response.data;
  },

  async create(data: CreateGenderDto): Promise<Gender> {
    const response = await apiClient.post(API_ENDPOINTS.GENDERS.CREATE, data);
    return response.data;
  },

  async update(id: number, data: UpdateGenderDto): Promise<Gender> {
    const response = await apiClient.put(API_ENDPOINTS.GENDERS.UPDATE(id), data);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.GENDERS.DELETE(id));
  },
};

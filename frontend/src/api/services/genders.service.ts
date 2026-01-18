import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";
import type { Gender } from "../../types/gender.types";

export const gendersService = {
  async findAll(): Promise<Gender[]> {
    const response = await apiClient.get(API_ENDPOINTS.GENDERS.LIST);
    return response.data;
  },
};

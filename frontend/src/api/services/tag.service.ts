import apiClient from "../client";
import { API_ENDPOINTS } from "../endpoints";

export const TagService = {
  list() {
    return apiClient.get(API_ENDPOINTS.TAGS.LIST);
  },

  create(payload: { name: string; color?: string }) {
    return apiClient.post(API_ENDPOINTS.TAGS.CREATE, payload);
  },

  update(id: number, payload: any) {
    return apiClient.put(API_ENDPOINTS.TAGS.UPDATE(id), payload);
  },

  delete(id: number) {
    return apiClient.delete(API_ENDPOINTS.TAGS.DELETE(id));
  },
};

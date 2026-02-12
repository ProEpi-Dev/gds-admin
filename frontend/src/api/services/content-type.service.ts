import apiClient from "../client";
import type { CreateContentTypeDto, UpdateContentTypeDto } from "../../types/content-type.types";

export const ContentTypeService = {
  async list() {
    return apiClient.get("/content-types");
  },

  async get(id: number) {
    return apiClient.get(`/content-types/${id}`);
  },
};

export const ContentTypeAdminService = {
  async list() {
    return apiClient.get("/admin/content-types");
  },

  async create(data: CreateContentTypeDto) {
    return apiClient.post("/admin/content-types", data);
  },

  async update(id: number, data: UpdateContentTypeDto) {
    return apiClient.put(`/admin/content-types/${id}`, data);
  },

  async delete(id: number) {
    return apiClient.delete(`/admin/content-types/${id}`);
  },
};

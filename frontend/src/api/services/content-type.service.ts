import apiClient from "../client";
import type { CreateContentTypeDto, UpdateContentTypeDto } from "../../types/content-type.types";

// Sem contexto, só o admin global passa no `content-type:manage`; manager e
// content_manager têm a permissão pelo papel no contexto.
function contextParams(contextId?: number) {
  return contextId != null ? { contextId } : undefined;
}

export const ContentTypeService = {
  async list() {
    return apiClient.get("/content-types");
  },

  async get(id: number) {
    return apiClient.get(`/content-types/${id}`);
  },
};

export const ContentTypeAdminService = {
  async list(contextId?: number) {
    return apiClient.get("/admin/content-types", { params: contextParams(contextId) });
  },

  async create(data: CreateContentTypeDto, contextId?: number) {
    return apiClient.post("/admin/content-types", data, { params: contextParams(contextId) });
  },

  async update(id: number, data: UpdateContentTypeDto, contextId?: number) {
    return apiClient.put(`/admin/content-types/${id}`, data, { params: contextParams(contextId) });
  },

  async delete(id: number, contextId?: number) {
    return apiClient.delete(`/admin/content-types/${id}`, { params: contextParams(contextId) });
  },
};

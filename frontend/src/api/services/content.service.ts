import apiClient from "../client";

/** Query usada pelo RolesGuard para avaliar permissões de contexto (ex.: content:write). */
function contextParams(contextId?: number) {
  return contextId != null ? { contextId } : undefined;
}

export const ContentService = {
  list(contextId?: number, includeInactive?: boolean) {
    const params = new URLSearchParams();
    if (contextId != null) params.append("contextId", String(contextId));
    if (includeInactive) params.append("includeInactive", "true");
    const query = params.toString();
    return apiClient.get(`/contents${query ? `?${query}` : ""}`);
  },

  get(id: number, contextId?: number) {
    return apiClient.get(`/contents/${id}`, { params: contextParams(contextId) });
  },

  create(data: any, contextId?: number) {
    return apiClient.post("/contents", data, { params: contextParams(contextId) });
  },

  update(id: number, data: any, contextId?: number) {
    return apiClient.put(`/contents/${id}`, data, {
      params: contextParams(contextId),
    });
  },

  delete(id: number, contextId?: number) {
    return apiClient.delete(`/contents/${id}`, { params: contextParams(contextId) });
  },

  reactivate(id: number, contextId?: number) {
    return apiClient.post(`/contents/${id}/reactivate`, null, {
      params: contextParams(contextId),
    });
  },

  permanentDelete(id: number, contextId?: number) {
    return apiClient.delete(`/contents/${id}/permanent`, {
      params: contextParams(contextId),
    });
  },
};

export const contentService = {
  async findAll(query?: { page?: number; pageSize?: number; contextId?: number }) {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());
    if (query?.contextId != null) params.append("contextId", query.contextId.toString());

    const response = await apiClient.get(`/contents?${params.toString()}`);
    return {
      data: response.data,
      meta: {
        totalItems: response.data.length, // Since backend doesn't paginate yet
        page: query?.page || 1,
        totalPages: 1,
        pageSize: response.data.length,
      },
    };
  },

  async findOne(id: number) {
    const response = await apiClient.get(`/contents/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await apiClient.post("/contents", data);
    return response.data;
  },

  async update(id: number, data: any) {
    const response = await apiClient.put(`/contents/${id}`, data);
    return response.data;
  },

  async remove(id: number) {
    await apiClient.delete(`/contents/${id}`);
  },
};

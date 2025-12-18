import apiClient from "../client";

export const ContentService = {
  list() {
    return apiClient.get("/contents");
  },

  get(id: number) {
    return apiClient.get(`/contents/${id}`);
  },

  create(data: any) {
    return apiClient.post("/contents", data);
  },

  update(id: number, data: any) {
    return apiClient.put(`/contents/${id}`, data);
  },

  delete(id: number) {
    return apiClient.delete(`/contents/${id}`);
  },
};

export const contentService = {
  async findAll(query?: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());

    const response = await apiClient.get(`/contents?${params.toString()}`);
    return {
      data: response.data,
      meta: {
        totalItems: response.data.length, // Since backend doesn't paginate yet
        currentPage: query?.page || 1,
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

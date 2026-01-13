import apiClient from "../client";

export const TrackService = {
  list() {
    return apiClient.get("/tracks");
  },

  get(id: number) {
    return apiClient.get(`/tracks/${id}`);
  },

  create(data: any) {
    return apiClient.post("/tracks", data);
  },

  update(id: number, data: any) {
    return apiClient.put(`/tracks/${id}`, data);
  },

  delete(id: number) {
    return apiClient.delete(`/tracks/${id}`);
  },

  addContentToSection(trackId: number, sectionId: number, contentId: number) {
    return apiClient.post(
      `/tracks/${trackId}/sections/${sectionId}/content/${contentId}`
    );
  },

  addFormToSection(trackId: number, sectionId: number, formId: number) {
    return apiClient.post(
      `/tracks/${trackId}/sections/${sectionId}/form/${formId}`
    );
  },
};

export const trackService = {
  async findAll(query?: { page?: number; pageSize?: number }) {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());

    const response = await apiClient.get(`/tracks?${params.toString()}`);
    return {
      data: response.data,
      meta: {
        totalItems: response.data.length,
        currentPage: query?.page || 1,
        totalPages: 1,
        pageSize: response.data.length,
      },
    };
  },

  async findOne(id: number) {
    const response = await apiClient.get(`/tracks/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await apiClient.post("/tracks", data);
    return response.data;
  },

  async update(id: number, data: any) {
    const response = await apiClient.put(`/tracks/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete(`/tracks/${id}`);
    return response.data;
  },

  async addContentToSection(
    trackId: number,
    sectionId: number,
    contentId: number
  ) {
    const response = await apiClient.post(
      `/tracks/${trackId}/sections/${sectionId}/content/${contentId}`
    );
    return response.data;
  },

  async addFormToSection(trackId: number, sectionId: number, formId: number) {
    const response = await apiClient.post(
      `/tracks/${trackId}/sections/${sectionId}/form/${formId}`
    );
    return response.data;
  },
};

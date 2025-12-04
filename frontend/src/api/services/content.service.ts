import apiClient from "../client";

export const ContentService = {
  list() {
    return apiClient.get("/content");
  },

  get(id: number) {
    return apiClient.get(`/content/${id}`);
  },

  create(data: any) {
    return apiClient.post("/content", data);
  },

  update(id: number, data: any) {
    return apiClient.put(`/content/${id}`, data);
  },

  delete(id: number) {
    return apiClient.delete(`/content/${id}`);
  },
};

export const TagService = {
  list() {
    return apiClient.get("/tag");
  },
};

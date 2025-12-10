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

export const TagService = {
  list() {
    return apiClient.get("/tag");
  },
};

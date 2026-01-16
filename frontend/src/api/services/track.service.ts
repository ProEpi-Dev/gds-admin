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

  removeSequence(trackId: number, sectionId: number, sequenceId: number) {
    return apiClient.delete(
      `/tracks/${trackId}/sections/${sectionId}/sequences/${sequenceId}`
    );
  },

  reorderSections(
    trackId: number,
    sections: Array<{ id: number; order: number }>
  ) {
    return apiClient.put(`/tracks/${trackId}/sections/reorder`, { sections });
  },

  reorderSequences(
    trackId: number,
    sectionId: number,
    sequences: Array<{ id: number; order: number }>
  ) {
    return apiClient.put(
      `/tracks/${trackId}/sections/${sectionId}/sequences/reorder`,
      { sequences }
    );
  },
};
